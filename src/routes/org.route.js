const express = require("express");
const controller = require("../controllers/org.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireOrgAdmin } = require("../middlewares/orgAdmin.middleware");

const router = express.Router();

router.get("/users", requireAuth, requireOrgAdmin, controller.listUsers);
router.get("/metrics/gas", requireAuth, requireOrgAdmin, controller.gasMetrics);
router.get("/anchors/status", requireAuth, requireOrgAdmin, controller.anchorStatus);
router.get("/anchors", requireAuth, requireOrgAdmin, controller.listAnchors);
router.post("/anchors/run", requireAuth, requireOrgAdmin, controller.runAnchor);
router.get(
  "/anchors/:anchorId/proof/:eventId",
  requireAuth,
  requireOrgAdmin,
  controller.anchorProof
);
router.patch("/users/:userId/active", requireAuth, requireOrgAdmin, controller.setUserActive);
router.patch("/users/:userId/admin", requireAuth, requireOrgAdmin, controller.setUserOrgAdmin);

module.exports = router;
