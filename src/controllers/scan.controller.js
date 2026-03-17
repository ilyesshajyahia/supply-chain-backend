const asyncHandler = require("../utils/asyncHandler");
const productService = require("../services/product.service");
const scanService = require("../services/scan.service");

const publicScan = asyncHandler(async (req, res) => {
  const data = await productService.registerPublicScan(req.body);
  res.json({ ok: true, data });
});

const publicScanHistory = asyncHandler(async (req, res) => {
  const scans = await scanService.getPublicScansByQrId(req.params.qrId);
  res.json({ ok: true, data: { qrId: req.params.qrId, scans } });
});

module.exports = { publicScan, publicScanHistory };
