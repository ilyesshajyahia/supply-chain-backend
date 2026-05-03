const express = require("express");
const controller = require("../controllers/product.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/role.middleware");

const router = express.Router();

router.get("/:identifier/history", controller.history);
router.post("/:identifier/flag", requireAuth, roleGuard(["admin", "manufacturer"]), controller.flagProduct);
router.post("/register", requireAuth, roleGuard(["manufacturer"]), controller.register);
router.post("/transfer", requireAuth, roleGuard(["distributor", "reseller"]), controller.transfer);
router.post("/finalize-sale", requireAuth, roleGuard(["reseller"]), controller.finalizeSale);
router.post("/:identifier/report-fake", requireAuth, roleGuard(["reseller"]), controller.reportFake);

module.exports = router;
