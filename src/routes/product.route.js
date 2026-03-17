const express = require("express");
const controller = require("../controllers/product.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/role.middleware");

const router = express.Router();

router.get("/:qrId/history", controller.history);
router.post("/register", requireAuth, roleGuard(["manufacturer"]), controller.register);
router.post("/transfer", requireAuth, roleGuard(["distributor", "reseller"]), controller.transfer);
router.post("/finalize-sale", requireAuth, roleGuard(["reseller"]), controller.finalizeSale);

module.exports = router;
