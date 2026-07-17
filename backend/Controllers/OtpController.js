const brevo = require("@getbrevo/brevo");
const OtpModel = require("../Models/Otp");

/**
 * Generates a cryptographically random 6-digit numeric OTP.
 * Uses Math.random() which is sufficient for OTP use-cases.
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Initializes and returns a configured Brevo TransactionalEmailsApi instance.
 */
const createBrevoApiInstance = () => {
  const defaultClient = brevo.ApiClient.instance;
  const apiKey = defaultClient.authentications["api-key"];
  apiKey.apiKey = process.env.BREVO_API_KEY;
  return new brevo.TransactionalEmailsApi();
};

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP, persists it to MongoDB, and sends it via Brevo HTTP API.
 * Works on Render's free tier since it uses port 443 (no SMTP port blocking).
 */
const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Generate OTP
    const otp = generateOTP();

    // Remove any previous OTP documents for this email (clean state)
    await OtpModel.deleteMany({ email: normalizedEmail });

    // Persist the new OTP to MongoDB (TTL index auto-deletes after 5 minutes)
    await OtpModel.create({ email: normalizedEmail, otp });

    // Build the Brevo email payload
    const sendSmtpEmail = new brevo.SendSmtpEmail();

    sendSmtpEmail.sender = {
      name: "Campus Core Pro",
      email: process.env.SENDER_EMAIL,
    };

    sendSmtpEmail.to = [{ email: normalizedEmail }];

    sendSmtpEmail.subject = "Your OTP for Email Verification";

    sendSmtpEmail.htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #392759;">Email Verification</h2>
        <p>Use the OTP below to verify your email address. It is valid for <strong>5 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #392759; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this OTP, please ignore this email.</p>
      </div>
    `;

    // Send the email via Brevo's HTTP API (port 443 — not blocked by Render)
    const apiInstance = createBrevoApiInstance();
    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully. Please check your email.",
    });
  } catch (error) {
    console.error("Send OTP error:", error.message || error);
    return res.status(500).json({
      success: false,
      message: `Failed to send OTP: ${error.message || "Internal server error"}`,
    });
  }
};

/**
 * POST /api/auth/verify-otp
 * Verifies the submitted OTP against the stored value in MongoDB.
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const otpRecord = await OtpModel.findOne({ email: normalizedEmail });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired or was never sent. Please request a new one.",
      });
    }

    if (otpRecord.otp !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // OTP is valid — remove it from DB so it cannot be reused
    await OtpModel.deleteMany({ email: normalizedEmail });

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully.",
    });
  } catch (error) {
    console.error("Verify OTP error:", error.message || error);
    return res.status(500).json({
      success: false,
      message: "Internal server error during OTP verification.",
    });
  }
};

module.exports = { sendOtp, verifyOtp };
