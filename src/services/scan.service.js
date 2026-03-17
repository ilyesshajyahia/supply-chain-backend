const ScanEvent = require("../models/scanEvent.model");

async function getPublicScansByQrId(qrId) {
  return ScanEvent.find({ qrId, scanType: "public" })
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();
}

module.exports = { getPublicScansByQrId };