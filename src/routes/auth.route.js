const express = require("express");
const controller = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/signup", controller.signup);
router.post("/login", controller.login);
router.get("/verify-email", controller.verifyEmail);
router.post("/resend-verification", controller.resendVerification);
router.post("/request-password-reset", controller.requestPasswordReset);
router.post("/reset-password", controller.resetPassword);
router.post("/refresh", controller.refresh);
router.get("/me", requireAuth, controller.me);

module.exports = router;