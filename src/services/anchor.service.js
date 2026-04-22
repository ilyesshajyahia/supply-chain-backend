const { ethers } = require("ethers");
const ApiError = require("../utils/ApiError");
const env = require("../config/env");
const Product = require("../models/product.model");
const ProductEvent = require("../models/productEvent.model");
const AnchorBatch = require("../models/anchorBatch.model");
const { anchorMerkleRootOnL1 } = require("./blockchain.service");

const anchorLocks = new Set();

function eventFilter(productIds) {
  return {
    productId: { $in: productIds },
    txHash: { $ne: null },
    "meta.network": "l2",
    $or: [
      { "meta.anchorBatchId": { $exists: false } },
      { "meta.anchorBatchId": null },
    ],
  };
}

function hashEventLeaf(event) {
  return ethers.solidityPackedKeccak256(
    [
      "string",
      "string",
      "string",
      "string",
      "string",
      "string",
      "string",
      "string",
      "uint256",
      "uint256",
    ],
    [
      String(event._id),
      String(event.productId),
      String(event.qrId || ""),
      String(event.action || ""),
      String(event.byRole || ""),
      String(event.txHash || ""),
      String(event.meta?.network || ""),
      String(event.meta?.chainId || ""),
      Number(event.blockNumber || 0),
      new Date(event.timestamp).getTime(),
    ]
  );
}

function buildMerkleLayers(leafHashes) {
  if (!leafHashes.length) return [];
  const layers = [leafHashes];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = prev[i + 1] || left;
      next.push(ethers.keccak256(ethers.concat([left, right])));
    }
    layers.push(next);
  }
  return layers;
}

function buildProof(leafHashes, index) {
  const layers = buildMerkleLayers(leafHashes);
  if (!layers.length) return [];

  const proof = [];
  let currentIndex = index;
  for (let layerIndex = 0; layerIndex < layers.length - 1; layerIndex += 1) {
    const layer = layers[layerIndex];
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    const sibling = layer[siblingIndex] || layer[currentIndex];
    proof.push(sibling);
    currentIndex = Math.floor(currentIndex / 2);
  }
  return proof;
}

async function getOrgProductIds(orgId) {
  const products = await Product.find({ orgId }).select("_id").lean();
  return products.map((p) => p._id);
}

async function evaluatePending(orgId) {
  const productIds = await getOrgProductIds(orgId);
  if (!productIds.length) {
    return { productIds, pendingCount: 0, oldestPendingAt: null };
  }

  const filter = eventFilter(productIds);
  const [pendingCount, oldest] = await Promise.all([
    ProductEvent.countDocuments(filter),
    ProductEvent.findOne(filter).sort({ timestamp: 1, _id: 1 }).lean(),
  ]);

  return {
    productIds,
    pendingCount,
    oldestPendingAt: oldest ? oldest.timestamp : null,
  };
}

function shouldAnchorNow({ pendingCount, oldestPendingAt }) {
  if (!env.l2Anchor.enabled || pendingCount <= 0) return null;
  if (pendingCount >= env.l2Anchor.batchSize) return "count_threshold";
  if (!oldestPendingAt) return null;

  const maxAgeMs = env.l2Anchor.maxAgeHours * 60 * 60 * 1000;
  if (Date.now() - new Date(oldestPendingAt).getTime() >= maxAgeMs) {
    return "time_threshold";
  }
  return null;
}

async function withOrgLock(orgId, fn) {
  if (anchorLocks.has(orgId)) {
    return {
      ok: false,
      skipped: true,
      reason: "anchor_already_in_progress",
    };
  }
  anchorLocks.add(orgId);
  try {
    return await fn();
  } finally {
    anchorLocks.delete(orgId);
  }
}

async function createAndAnchorBatch({ orgId, triggerReason = "manual" }) {
  return withOrgLock(orgId, async () => {
    const productIds = await getOrgProductIds(orgId);
    if (!productIds.length) {
      return { ok: true, skipped: true, reason: "no_products_in_org" };
    }

    const pendingFilter = eventFilter(productIds);
    const pendingEvents = await ProductEvent.find(pendingFilter)
      .sort({ timestamp: 1, _id: 1 })
      .limit(env.l2Anchor.batchSize)
      .lean();

    if (!pendingEvents.length) {
      return { ok: true, skipped: true, reason: "no_pending_l2_events" };
    }

    const anchoredCount = await ProductEvent.countDocuments({
      productId: { $in: productIds },
      "meta.network": "l2",
      "meta.anchorBatchId": { $exists: true, $ne: null },
    });

    const startIndex = anchoredCount + 1;
    const endIndex = anchoredCount + pendingEvents.length;
    const leafItems = pendingEvents.map((event) => ({
      eventId: event._id,
      leafHash: hashEventLeaf(event),
    }));
    const rootLayers = buildMerkleLayers(leafItems.map((l) => l.leafHash));
    const merkleRoot = rootLayers[rootLayers.length - 1][0];

    const batch = await AnchorBatch.create({
      orgId,
      network: "l2",
      l2ChainId: env.l2.chainId,
      l1ChainId: env.l1.chainId,
      fromEventId: pendingEvents[0]._id,
      toEventId: pendingEvents[pendingEvents.length - 1]._id,
      startIndex,
      endIndex,
      eventCount: pendingEvents.length,
      merkleRoot,
      leafItems,
      triggerReason,
      status: "pending",
      l1ContractAddress: env.l1.anchorRegistryAddress || null,
    });

    try {
      const l1Result = await anchorMerkleRootOnL1({
        merkleRoot,
        fromEventIndex: startIndex,
        toEventIndex: endIndex,
        eventCount: pendingEvents.length,
      });

      batch.status = "anchored";
      batch.l1TxHash = l1Result.txHash;
      batch.l1BlockNumber = l1Result.blockNumber;
      batch.anchoredAt = new Date();
      await batch.save();

      await ProductEvent.updateMany(
        { _id: { $in: pendingEvents.map((e) => e._id) } },
        {
          $set: {
            "meta.anchorBatchId": String(batch._id),
            "meta.anchorMerkleRoot": merkleRoot,
            "meta.anchorL1TxHash": l1Result.txHash,
            "meta.anchorL1ChainId": l1Result.chainId,
          },
        }
      );

      return {
        ok: true,
        anchored: true,
        batch: {
          id: String(batch._id),
          eventCount: batch.eventCount,
          merkleRoot: batch.merkleRoot,
          l1TxHash: batch.l1TxHash,
          startIndex: batch.startIndex,
          endIndex: batch.endIndex,
        },
      };
    } catch (err) {
      batch.status = "failed";
      batch.errorMessage = err?.message || "Anchor failed";
      await batch.save();
      throw err;
    }
  });
}

async function maybeAnchorL2ForOrg(orgId) {
  if (!orgId || !env.l2Anchor.enabled) {
    return { ok: false, skipped: true, reason: "anchor_disabled" };
  }
  if (!env.l1.anchorRegistryAddress) {
    return { ok: false, skipped: true, reason: "l1_anchor_registry_missing" };
  }

  const pending = await evaluatePending(orgId);
  const reason = shouldAnchorNow(pending);
  if (!reason) {
    return {
      ok: true,
      anchored: false,
      reason: "threshold_not_reached",
      pendingCount: pending.pendingCount,
      oldestPendingAt: pending.oldestPendingAt,
    };
  }
  return createAndAnchorBatch({ orgId, triggerReason: reason });
}

async function listAnchors(orgId, limit = 20) {
  const cappedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  return AnchorBatch.find({ orgId })
    .sort({ createdAt: -1 })
    .limit(cappedLimit)
    .lean();
}

async function getAnchorStatus(orgId) {
  const pending = await evaluatePending(orgId);
  const latest = await AnchorBatch.findOne({ orgId, status: "anchored" })
    .sort({ anchoredAt: -1 })
    .lean();
  return {
    enabled: env.l2Anchor.enabled,
    threshold: {
      batchSize: env.l2Anchor.batchSize,
      maxAgeHours: env.l2Anchor.maxAgeHours,
    },
    pendingCount: pending.pendingCount,
    oldestPendingAt: pending.oldestPendingAt,
    latestAnchor: latest || null,
  };
}

async function buildAnchorProof({ orgId, anchorId, eventId }) {
  const batch = await AnchorBatch.findOne({ _id: anchorId, orgId }).lean();
  if (!batch) {
    throw new ApiError(404, "Anchor batch not found");
  }

  const idx = batch.leafItems.findIndex((item) => String(item.eventId) === String(eventId));
  if (idx < 0) {
    throw new ApiError(404, "Event is not part of this anchor batch");
  }

  const leafHashes = batch.leafItems.map((item) => item.leafHash);
  const proof = buildProof(leafHashes, idx);
  return {
    anchorId: String(batch._id),
    eventId: String(eventId),
    index: idx,
    merkleRoot: batch.merkleRoot,
    leafHash: leafHashes[idx],
    proof,
    l1TxHash: batch.l1TxHash,
    l1BlockNumber: batch.l1BlockNumber,
    l1ChainId: batch.l1ChainId,
    l1ContractAddress: batch.l1ContractAddress,
    anchoredAt: batch.anchoredAt,
  };
}

async function sweepAnchorsForAllOrgs() {
  if (!env.l2Anchor.enabled || !env.l1.anchorRegistryAddress) {
    return { ok: false, skipped: true, reason: "anchor_not_configured" };
  }

  const orgIds = await Product.distinct("orgId", { orgId: { $ne: null } });
  const results = [];
  for (const orgId of orgIds) {
    // eslint-disable-next-line no-await-in-loop
    const result = await maybeAnchorL2ForOrg(orgId);
    results.push({ orgId, ...result });
  }
  return { ok: true, scannedOrgs: orgIds.length, results };
}

module.exports = {
  maybeAnchorL2ForOrg,
  createAndAnchorBatch,
  listAnchors,
  getAnchorStatus,
  buildAnchorProof,
  sweepAnchorsForAllOrgs,
};
