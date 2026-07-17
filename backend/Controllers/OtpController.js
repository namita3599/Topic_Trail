const axios = require("axios");
const nodemailer = require("nodemailer");
const OtpModel = require("../Models/Otp");

/**
 * Generates a 6-digit numeric OTP.
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Sends an email via Brevo REST API directly (for production).
 */
const sendBrevoEmail = async (toEmail, otp) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not defined in environment variables");
  }
  if (!process.env.SENDER_EMAIL) {
    throw new Error("SENDER_EMAIL is not defined in environment variables");
  }

  const payload = {
    sender: { name: "Campus Core Pro", email: process.env.SENDER_EMAIL },
    to: [{ email: toEmail }],
    subject: "Your OTP for Email Verification",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #392759;">Email Verification</h2>
        <p>Use the OTP below to verify your email. It is valid for <strong>60 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #392759; margin: 24px 0;">${otp}</div>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  const response = await axios.post(
    "https://api.brevo.com/v3/smtp/email",
    payload,
    {
      headers: {
        "api-key": process.env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    }
  );
  return response.data;
};

/**
 * Sends an email via Gmail SMTP using Nodemailer (for local development).
 */
const sendNodemailerEmail = async (toEmail, otp) => {
  if (!process.env.EMAIL_USER) {
    throw new Error("EMAIL_USER is not defined in environment variables");
  }
  if (!process.env.EMAIL_APP_PASSWORD) {
    throw new Error("EMAIL_APP_PASSWORD is not defined in environment variables");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD.trim().replace(/\s+/g, ""),
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Your OTP for Email Verification",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #392759;">Email Verification</h2>
        <p>Use the OTP below to verify your email. It is valid for <strong>10 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #392759; margin: 24px 0;">${otp}</div>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

/**
 * POST /api/auth/send-otp
 * Generates a 6-digit OTP, persists it to MongoDB, and sends it via environment-aware channels.
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
    const otp = generateOTP();

    // Clean old OTPs
    await OtpModel.deleteMany({ email: normalizedEmail });

    // Store new OTP
    await OtpModel.create({ email: normalizedEmail, otp });

    const isProduction = process.env.NODE_ENV === "production";

    if (isProduction) {
      // Production: send via Brevo REST API (port 443)
      await sendBrevoEmail(normalizedEmail, otp);
    } else {
      // Local/development: Log the OTP to terminal and send via Nodemailer Gmail SMTP
      console.log(`[DEV MODE] OTP generated for ${normalizedEmail}: ${otp}`);
      await sendNodemailerEmail(normalizedEmail, otp);
    }

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
 * Verifies the submitted OTP against the stored value in MongoDB with dynamic expiry checks.
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

    // Dynamic Expiry Check:
    // Production gets 60 minutes, development gets 10 minutes.
    const isProduction = process.env.NODE_ENV === "production";
    const expiryMinutes = isProduction ? 60 : 10;
    const timeElapsedMs = Date.now() - new Date(otpRecord.createdAt).getTime();
    const timeElapsedMinutes = timeElapsedMs / (1000 * 60);

    if (timeElapsedMinutes > expiryMinutes) {
      // Expired: delete record and fail verification
      await OtpModel.deleteMany({ email: normalizedEmail });
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    if (otpRecord.otp !== String(otp).trim()) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again.",
      });
    }

    // Successful verification: delete OTP record so it cannot be reused
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
