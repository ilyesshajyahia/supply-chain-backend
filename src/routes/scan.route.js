const express = require("express");
const controller = require("../controllers/scan.controller");

const router = express.Router();
router.post("/public", controller.publicScan);
router.get("/public/:qrId/history", controller.publicScanHistory);

module.exports = router;
