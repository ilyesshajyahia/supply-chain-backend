const express = require("express");
const controller = require("../controllers/chat.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const roleGuard = require("../middlewares/role.middleware");

const router = express.Router();
const internalRolesOnly = roleGuard(["manufacturer", "distributor", "reseller"]);

router.get("/messages", requireAuth, internalRolesOnly, controller.listMessages);
router.post("/messages", requireAuth, internalRolesOnly, controller.sendMessage);
router.get("/participants", requireAuth, internalRolesOnly, controller.listParticipants);

module.exports = router;
