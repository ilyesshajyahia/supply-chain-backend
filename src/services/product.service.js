const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");
const Product = require("../models/product.model");
const ProductEvent = require("../models/productEvent.model");
const ScanEvent = require("../models/scanEvent.model");
const CounterfeitFlag = require("../models/counterfeitFlag.model");
const { isInAuthorizedZone } = require("./geofence.service");
const { addProductOnChain, addLifecycleEventOnChain } = require("./blockchain.service");

function toPoint(longitude, latitude) {
  return { type: "Point", coordinates: [Number(longitude), Number(latitude)] };
}

function locationText(longitude, latitude) {
  return `${latitude},${longitude}`;
}

function normalizeIdentifier(value) {
  const text = String(value || "").trim();
  return text || null;
}

function normalizeOptionalText(value, max = 256) {
  const text = String(value || "").trim();
  if (!text) return null;
  return text.length > max ? text.slice(0, max) : text;
}

async function findProductByIdentifier(identifier, session = null) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;
  const query = {
    $or: [{ qrId: normalized }, { serialNumber: normalized }],
  };
  if (session) {
    return Product.findOne(query).session(session);
  }
  return Product.findOne(query);
}

async function ensureZone({ user, longitude, latitude, session }) {
  const allowed = await isInAuthorizedZone({
    orgId: user.orgId,
    role: user.role,
    longitude: Number(longitude),
    latitude: Number(latitude),
    session,
  });
  if (!allowed) {
    throw new ApiError(403, "User is outside authorized geofence");
  }
}

async function registerProduct({ user, payload }) {
  const { qrId, productIdOnChain, name, longitude, latitude } = payload;
  const network = String(payload.network || "").trim().toLowerCase() || undefined;
  const serialNumber = normalizeIdentifier(payload.serialNumber);
  const brand = normalizeOptionalText(payload.brand, 120);
  const category = normalizeOptionalText(payload.category, 120);
  const color = normalizeOptionalText(payload.color, 80);
  const description = normalizeOptionalText(payload.description, 1000);
  if (!qrId || !productIdOnChain || !name) {
    throw new ApiError(400, "qrId, productIdOnChain, and name are required");
  }
  if (user.role !== "manufacturer") {
    throw new ApiError(403, "Only manufacturer can register product");
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      await ensureZone({ user, longitude, latitude, session });

      const existing = await Product.findOne({ qrId }).session(session);
      if (existing) {
        throw new ApiError(409, "Product with this qrId already exists");
      }
      if (serialNumber) {
        const serialExists = await Product.findOne({ serialNumber }).session(
          session
        );
        if (serialExists) {
          throw new ApiError(409, "Product with this serialNumber already exists");
        }
      }

      const chainResultProduct = await addProductOnChain(productIdOnChain, name, {
        network,
      });
      const chainResultEvent = await addLifecycleEventOnChain(
        productIdOnChain,
        "Manufactured",
        locationText(longitude, latitude),
        { network }
      );

      const product = await Product.create(
        [
          {
            qrId,
            serialNumber,
            orgId: user.orgId,
            name,
            brand,
            category,
            color,
            description,
            productIdOnChain: String(productIdOnChain),
            status: "at_manufacturer",
            currentOwnerRole: "manufacturer",
            isSold: false,
            soldAt: null,
            lastTxHash: chainResultEvent.txHash || chainResultProduct.txHash,
          },
        ],
        { session }
      );

      await ProductEvent.create(
        [
          {
            productId: product[0]._id,
            qrId,
            action: "created",
            byUserId: user._id,
            byRole: user.role,
            location: toPoint(longitude, latitude),
            txHash: chainResultEvent.txHash,
            blockNumber: chainResultEvent.blockNumber,
            timestamp: new Date(),
            meta: {
              eventType: "Manufactured",
              network: chainResultEvent.network || chainResultProduct.network || null,
              chainId: chainResultEvent.chainId || chainResultProduct.chainId || null,
              registryAddress:
                chainResultProduct.registryAddress || chainResultEvent.registryAddress || null,
              lifecycleAddress:
                chainResultEvent.lifecycleAddress || chainResultProduct.lifecycleAddress || null,
              registryTxHash: chainResultProduct.txHash,
              registryGas: chainResultProduct.gas || null,
              lifecycleGas: chainResultEvent.gas || null,
            },
          },
        ],
        { session }
      );

      result = product[0];
    });

    return result;
  } finally {
    await session.endSession();
  }
}

function transferRules(role) {
  if (role === "distributor" || role === "retailer") {
    return {
      expectedCurrentOwner: ["manufacturer"],
      nextOwner: "distributor",
      nextStatus: "at_distributor",
      eventTypeOnChain: "Retail",
      eventType: "Distributed",
      action: "transferred_to_distributor",
    };
  }

  if (role === "reseller") {
    return {
      expectedCurrentOwner: ["distributor", "retailer"],
      nextOwner: "reseller",
      nextStatus: "at_reseller",
      eventTypeOnChain: "Resold",
      eventType: "Resold",
      action: "transferred_to_reseller",
    };
  }

  return null;
}

async function transferProduct({ user, payload }) {
  const { longitude, latitude } = payload;
  const network = String(payload.network || "").trim().toLowerCase() || undefined;
  const identifier = normalizeIdentifier(
    payload.qrId || payload.identifier || payload.serialNumber
  );
  if (!identifier) throw new ApiError(400, "qrId or serialNumber is required");

  const rules = transferRules(user.role);
  if (!rules) {
    throw new ApiError(403, "Only distributor or reseller can transfer in this step");
  }

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      await ensureZone({ user, longitude, latitude, session });

      const product = await findProductByIdentifier(identifier, session);
      if (!product) throw new ApiError(404, "Product not found");
      if (product.isSold) throw new ApiError(409, "Product already sold and immutable");
      if (!rules.expectedCurrentOwner.includes(product.currentOwnerRole)) {
        throw new ApiError(
          409,
          `Invalid transition. Expected current owner: ${rules.expectedCurrentOwner.join(", ")}`
        );
      }

      const chainResult = await addLifecycleEventOnChain(
        product.productIdOnChain,
        rules.eventTypeOnChain || rules.eventType,
        locationText(longitude, latitude),
        { network }
      );

      product.currentOwnerRole = rules.nextOwner;
      product.status = rules.nextStatus;
      product.lastTxHash = chainResult.txHash;
      await product.save({ session });

      await ProductEvent.create(
        [
          {
            productId: product._id,
            qrId: product.qrId,
            action: rules.action,
            byUserId: user._id,
            byRole: user.role,
            location: toPoint(longitude, latitude),
            txHash: chainResult.txHash,
            blockNumber: chainResult.blockNumber,
            timestamp: new Date(),
            meta: {
              eventType: rules.eventType,
              network: chainResult.network || null,
              chainId: chainResult.chainId || null,
              lifecycleAddress: chainResult.lifecycleAddress || null,
              gas: chainResult.gas || null,
            },
          },
        ],
        { session }
      );

      await ScanEvent.create(
        [
          {
            productId: product._id,
            qrId: product.qrId,
            scanType: "internal",
            scannedByUserId: user._id,
            location: toPoint(longitude, latitude),
            result: "verified",
            scannedIdentifier: identifier,
            timestamp: new Date(),
          },
        ],
        { session }
      );

      updated = product;
    });

    return updated;
  } finally {
    await session.endSession();
  }
}

async function finalizeSale({ user, payload }) {
  const { longitude, latitude } = payload;
  const network = String(payload.network || "").trim().toLowerCase() || undefined;
  const identifier = normalizeIdentifier(
    payload.qrId || payload.identifier || payload.serialNumber
  );
  if (user.role !== "reseller") {
    throw new ApiError(403, "Only reseller can finalize sale");
  }
  if (!identifier) throw new ApiError(400, "qrId or serialNumber is required");

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      await ensureZone({ user, longitude, latitude, session });

      const product = await findProductByIdentifier(identifier, session);
      if (!product) throw new ApiError(404, "Product not found");
      if (product.isSold) throw new ApiError(409, "Product already sold");
      if (product.currentOwnerRole !== "reseller") {
        throw new ApiError(409, "Product must be with reseller before final sale");
      }

      const chainResult = await addLifecycleEventOnChain(
        product.productIdOnChain,
        "Purchased",
        locationText(longitude, latitude),
        { network }
      );

      product.isSold = true;
      product.status = "sold";
      product.soldAt = new Date();
      product.lastTxHash = chainResult.txHash;
      await product.save({ session });

      await ProductEvent.create(
        [
          {
            productId: product._id,
            qrId: product.qrId,
            action: "sold",
            byUserId: user._id,
            byRole: user.role,
            location: toPoint(longitude, latitude),
            txHash: chainResult.txHash,
            blockNumber: chainResult.blockNumber,
            timestamp: new Date(),
            meta: {
              eventType: "Purchased",
              network: chainResult.network || null,
              chainId: chainResult.chainId || null,
              lifecycleAddress: chainResult.lifecycleAddress || null,
              gas: chainResult.gas || null,
            },
          },
        ],
        { session }
      );

      updated = product;
    });

    return updated;
  } finally {
    await session.endSession();
  }
}

async function getProductHistoryByQrId(qrId) {
  const normalized = normalizeIdentifier(qrId);
  const product = await findProductByIdentifier(normalized);
  if (!product) return null;

  const events = await ProductEvent.find({ productId: product._id })
    .sort({ timestamp: 1 })
    .lean();

  return { product: product.toObject ? product.toObject() : product, events };
}

async function registerPublicScan({ qrId, serialNumber, identifier, longitude, latitude }) {
  const resolvedIdentifier = normalizeIdentifier(identifier || qrId || serialNumber);
  if (!resolvedIdentifier) {
    throw new ApiError(400, "identifier (qrId or serialNumber) is required");
  }

  const product = await findProductByIdentifier(resolvedIdentifier);
  const now = new Date();
  const canonicalQr = product ? product.qrId : resolvedIdentifier;

  if (!product) {
    await ScanEvent.create({
      productId: null,
      qrId: canonicalQr,
      scannedIdentifier: resolvedIdentifier,
      scanType: "public",
      scannedByUserId: null,
      location: toPoint(longitude, latitude),
      result: "unknown_qr",
      timestamp: now,
    });

    return { result: "unknown_qr", product: null };
  }

  let result = "verified";
  if (product.isSold) {
    const soldPublicScans = await ScanEvent.countDocuments({
      productId: product._id,
      scanType: "public",
      timestamp: { $gte: product.soldAt || new Date(0) },
    });

    if (soldPublicScans >= 1) {
      result = "duplicate_scan_after_sold";
    }
  }

  const scanEvent = await ScanEvent.create({
    productId: product._id,
    qrId: canonicalQr,
    scannedIdentifier: resolvedIdentifier,
    scanType: "public",
    scannedByUserId: null,
    location: toPoint(longitude, latitude),
    result,
    timestamp: now,
  });

  if (result === "duplicate_scan_after_sold") {
    await CounterfeitFlag.updateOne(
      { productId: product._id, reason: "duplicate_scan_after_sold", isOpen: true },
      {
        $setOnInsert: {
          qrId: canonicalQr,
          scannedIdentifier: resolvedIdentifier,
          productId: product._id,
          reason: "duplicate_scan_after_sold",
          severity: "high",
          firstDetectedAt: now,
          isOpen: true,
        },
        $addToSet: { scanEventIds: scanEvent._id },
      },
      { upsert: true }
    );
  }

  return { result, product: product.toObject() };
}

module.exports = {
  registerProduct,
  transferProduct,
  finalizeSale,
  getProductHistoryByQrId,
  registerPublicScan,
};
