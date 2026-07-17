const express = require("express");
const router = express.Router();
const { sendOtp, verifyOtp } = require("../Controllers/OtpController");

// POST /api/auth/send-otp
router.post("/send-otp", sendOtp);

// POST /api/auth/verify-otp
router.post("/verify-otp", verifyOtp);

module.exports = router;
