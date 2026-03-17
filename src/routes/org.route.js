const express = require("express");
const controller = require("../controllers/org.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { requireOrgAdmin } = require("../middlewares/orgAdmin.middleware");

const router = express.Router();

router.get("/users", requireAuth, requireOrgAdmin, controller.listUsers);
router.patch("/users/:userId/active", requireAuth, requireOrgAdmin, controller.setUserActive);
router.patch("/users/:userId/admin", requireAuth, requireOrgAdmin, controller.setUserOrgAdmin);

module.exports = router;