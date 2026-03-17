const express = require("express");
const controller = require("../controllers/zone.controller");

const router = express.Router();

router.get("/active", controller.listActive);

module.exports = router;

