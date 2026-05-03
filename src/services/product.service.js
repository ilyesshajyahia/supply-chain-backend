const mongoose = require("mongoose");
const ApiError = require("../utils/ApiError");
const Product = require("../models/product.model");
const ProductEvent = require("../models/productEvent.model");
const ScanEvent = require("../models/scanEvent.model");
const CounterfeitFlag = require("../models/counterfeitFlag.model");
const { isInAuthorizedZone } = require("./geofence.service");
const { addProductOnChain, addLifecycleEventOnChain } = require("./blockchain.service");
const { maybeAnchorL2ForOrg } = require("./anchor.service");
const orgService = require("./org.service");

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

function haversineDistanceKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) *
      Math.sin(dLon / 2) *
      Math.cos(lat1) *
      Math.cos(lat2);
  return earth * 2 * Math.asin(Math.sqrt(h));
}

function validateOfflineTimestamp(timestamp) {
  if (!timestamp) return;
  const scanDate = new Date(timestamp);
  const now = new Date();

  const hour = scanDate.getHours();
  if (hour < 6 || hour >= 19) {
    throw new ApiError(403, `Offline scan rejected: Scan time is outside the 6 AM - 7 PM shift window.`);
  }

  const hoursOld = (now - scanDate) / (1000 * 60 * 60);
  if (hoursOld > 24) {
    throw new ApiError(403, "Offline scan expired: Scans must be synced within 24 hours.");
  }
  
  if (hoursOld < -1) {
    throw new ApiError(403, "Offline scan rejected: Timestamp is in the future.");
  }
}

async function checkImpossibleTravel(productId, newLng, newLat, newTimestamp) {
  const lastScan = await ScanEvent.findOne({ productId }).sort({ timestamp: -1 }).lean();
  const lastProductEvent = await ProductEvent.findOne({ productId }).sort({ timestamp: -1 }).lean();
  
  let lastEvent = null;
  if (lastScan && lastProductEvent) {
    lastEvent = lastScan.timestamp > lastProductEvent.timestamp ? lastScan : lastProductEvent;
  } else {
    lastEvent = lastScan || lastProductEvent;
  }

  if (!lastEvent || !lastEvent.location || !lastEvent.location.coordinates) return false;

  const [oldLng, oldLat] = lastEvent.location.coordinates;
  const distance = haversineDistanceKm({ lat: oldLat, lng: oldLng }, { lat: Number(newLat), lng: Number(newLng) });
  const timeDiffHours = (new Date(newTimestamp) - new Date(lastEvent.timestamp)) / (1000 * 60 * 60);

  if (timeDiffHours <= 0) return false;

  const speed = distance / timeDiffHours;
  if (speed > 1000 && distance > 100) { // Faster than 1000km/h and at least 100km apart
    return true;
  }
  return false;
}

async function triggerAutoAnchorIfNeeded(orgId, network) {
  if (String(network || "").toLowerCase() !== "l2") return;
  try {
    await maybeAnchorL2ForOrg(orgId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Auto-anchor failed:", err?.message || err);
  }
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
  const batchNumber = normalizeIdentifier(payload.batchNumber);
  if (!qrId || !productIdOnChain || !name) {
    throw new ApiError(400, "qrId, productIdOnChain, and name are required");
  }
  if (user.role !== "manufacturer") {
    throw new ApiError(403, "Only manufacturer can register product");
  }

  validateOfflineTimestamp(payload.offlineTimestamp);

  const session = await mongoose.startSession();
  try {
    let result;
    let eventNetwork = null;
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
      eventNetwork = chainResultEvent.network || chainResultProduct.network || null;

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
            batchNumber,
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
            timestamp: payload.offlineTimestamp ? new Date(payload.offlineTimestamp) : new Date(),
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
    await triggerAutoAnchorIfNeeded(user.orgId, eventNetwork);

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

  validateOfflineTimestamp(payload.offlineTimestamp);

  const session = await mongoose.startSession();
  try {
    let updated;
    let eventNetwork = null;
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
      eventNetwork = chainResult.network || null;

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
            timestamp: payload.offlineTimestamp ? new Date(payload.offlineTimestamp) : new Date(),
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
            timestamp: payload.offlineTimestamp ? new Date(payload.offlineTimestamp) : new Date(),
          },
        ],
        { session }
      );

      updated = product;
    });
    await triggerAutoAnchorIfNeeded(user.orgId, eventNetwork);

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

  validateOfflineTimestamp(payload.offlineTimestamp);

  const session = await mongoose.startSession();
  try {
    let updated;
    let eventNetwork = null;
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
      eventNetwork = chainResult.network || null;

      product.isSold = true;
      product.status = "sold";
      product.soldAt = payload.offlineTimestamp ? new Date(payload.offlineTimestamp) : new Date();
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
            timestamp: payload.offlineTimestamp ? new Date(payload.offlineTimestamp) : new Date(),
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
    await triggerAutoAnchorIfNeeded(user.orgId, eventNetwork);

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

  const existingFlag = await CounterfeitFlag.findOne({ qrId: canonicalQr, isOpen: true }).lean();
  if (existingFlag) {
    return { result: "flagged_as_fake", product: product.toObject() };
  }

  let result = "verified";
  if (product.batchStatus && product.batchStatus !== "active") {
    result = "batch_warning";
  }

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

  if (result === "verified") {
    const isImpossible = await checkImpossibleTravel(product._id, longitude, latitude, now);
    if (isImpossible) {
      result = "impossible_travel";
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

  if (result === "duplicate_scan_after_sold" || result === "impossible_travel") {
    await CounterfeitFlag.updateOne(
      { productId: product._id, reason: result, isOpen: true },
      {
        $setOnInsert: {
          qrId: canonicalQr,
          scannedIdentifier: resolvedIdentifier,
          productId: product._id,
          reason: result,
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

async function flagProductManual(qrId, reason, byUserId) {
  const normalized = normalizeIdentifier(qrId);
  if (!normalized) throw new ApiError(400, "qrId is required");

  const product = await findProductByIdentifier(normalized);
  if (!product) throw new ApiError(404, "Product not found");

  await CounterfeitFlag.updateOne(
    { productId: product._id, reason, isOpen: true },
    {
      $setOnInsert: {
        qrId: product.qrId,
        scannedIdentifier: product.qrId,
        productId: product._id,
        reason,
        severity: "high",
        firstDetectedAt: new Date(),
        isOpen: true,
      },
    },
    { upsert: true }
  );

  return product;
}
async function reportFakeProduct({ identifier, user, reason }) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) throw new ApiError(400, "identifier is required");

  if (user.role !== "reseller") {
    throw new ApiError(403, "Only a reseller can report a fake product");
  }

  const product = await findProductByIdentifier(normalized);
  if (!product) throw new ApiError(404, "Product not found");

  product.status = "suspicious";
  await product.save();

  await CounterfeitFlag.updateOne(
    { productId: product._id, isOpen: true },
    {
      $setOnInsert: {
        qrId: product.qrId,
        scannedIdentifier: product.qrId,
        productId: product._id,
        reason: reason || "reported_by_reseller",
        severity: "high",
        firstDetectedAt: new Date(),
        isOpen: true,
      },
    },
    { upsert: true }
  );

  if (product.batchNumber) {
    const totalCount = await Product.countDocuments({ orgId: product.orgId, batchNumber: product.batchNumber });
    const suspiciousCount = await Product.countDocuments({ orgId: product.orgId, batchNumber: product.batchNumber, status: "suspicious" });

    if (totalCount > 0) {
      const ratio = suspiciousCount / totalCount;
      if (ratio >= 0.30 && suspiciousCount >= 3) {
        await orgService.flagBatch({
          orgId: product.orgId,
          batchNumber: product.batchNumber,
          status: "suspicious",
          reason: "Auto-quarantine: Exceeded 30% counterfeit report threshold from resellers.",
          actorUser: user,
          req: null,
        });
      }
    }
  }

  return product;
}

module.exports = {
  registerProduct,
  transferProduct,
  finalizeSale,
  getProductHistoryByQrId,
  registerPublicScan,
  flagProductManual,
  reportFakeProduct,
};
