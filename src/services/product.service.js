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

      const chainResultProduct = await addProductOnChain(productIdOnChain, name);
      const chainResultEvent = await addLifecycleEventOnChain(
        productIdOnChain,
        "Manufactured",
        locationText(longitude, latitude)
      );

      const product = await Product.create(
        [
          {
            qrId,
            orgId: user.orgId,
            name,
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
              registryTxHash: chainResultProduct.txHash,
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
      eventType: "Distributed",
      action: "transferred_to_distributor",
    };
  }

  if (role === "reseller") {
    return {
      expectedCurrentOwner: ["distributor", "retailer"],
      nextOwner: "reseller",
      nextStatus: "at_reseller",
      eventType: "Resold",
      action: "transferred_to_reseller",
    };
  }

  return null;
}

async function transferProduct({ user, payload }) {
  const { qrId, longitude, latitude } = payload;
  if (!qrId) throw new ApiError(400, "qrId is required");

  const rules = transferRules(user.role);
  if (!rules) {
    throw new ApiError(403, "Only distributor or reseller can transfer in this step");
  }

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      await ensureZone({ user, longitude, latitude, session });

      const product = await Product.findOne({ qrId }).session(session);
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
        rules.eventType,
        locationText(longitude, latitude)
      );

      product.currentOwnerRole = rules.nextOwner;
      product.status = rules.nextStatus;
      product.lastTxHash = chainResult.txHash;
      await product.save({ session });

      await ProductEvent.create(
        [
          {
            productId: product._id,
            qrId,
            action: rules.action,
            byUserId: user._id,
            byRole: user.role,
            location: toPoint(longitude, latitude),
            txHash: chainResult.txHash,
            blockNumber: chainResult.blockNumber,
            timestamp: new Date(),
            meta: { eventType: rules.eventType },
          },
        ],
        { session }
      );

      await ScanEvent.create(
        [
          {
            productId: product._id,
            qrId,
            scanType: "internal",
            scannedByUserId: user._id,
            location: toPoint(longitude, latitude),
            result: "verified",
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
  const { qrId, longitude, latitude } = payload;
  if (user.role !== "reseller") {
    throw new ApiError(403, "Only reseller can finalize sale");
  }

  const session = await mongoose.startSession();
  try {
    let updated;
    await session.withTransaction(async () => {
      await ensureZone({ user, longitude, latitude, session });

      const product = await Product.findOne({ qrId }).session(session);
      if (!product) throw new ApiError(404, "Product not found");
      if (product.isSold) throw new ApiError(409, "Product already sold");
      if (product.currentOwnerRole !== "reseller") {
        throw new ApiError(409, "Product must be with reseller before final sale");
      }

      const chainResult = await addLifecycleEventOnChain(
        product.productIdOnChain,
        "Purchased",
        locationText(longitude, latitude)
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
            qrId,
            action: "sold",
            byUserId: user._id,
            byRole: user.role,
            location: toPoint(longitude, latitude),
            txHash: chainResult.txHash,
            blockNumber: chainResult.blockNumber,
            timestamp: new Date(),
            meta: { eventType: "Purchased" },
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
  const product = await Product.findOne({ qrId }).lean();
  if (!product) return null;

  const events = await ProductEvent.find({ productId: product._id })
    .sort({ timestamp: 1 })
    .lean();

  return { product, events };
}

async function registerPublicScan({ qrId, longitude, latitude }) {
  const product = await Product.findOne({ qrId });
  const now = new Date();

  if (!product) {
    await ScanEvent.create({
      productId: null,
      qrId,
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
    qrId,
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
          qrId,
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
