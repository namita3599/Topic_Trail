const axios = require("axios");

/**
 * Sends an OTP verification email via Brevo's REST API over port 443.
 * Uses axios directly to avoid SDK version incompatibilities.
 * Works on Render/Vercel free tier (no SMTP port blocking).
 */
const sendOTPEmail = async (email, otp) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY must be set in environment variables");
  }
  if (!process.env.SENDER_EMAIL) {
    throw new Error("SENDER_EMAIL must be set in environment variables");
  }

  const payload = {
    sender: {
      name: "Topic Trail",
      email: process.env.SENDER_EMAIL,
    },
    to: [{ email: String(email).trim().toLowerCase() }],
    subject: "Email Verification OTP",
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 24px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #392759;">Email Verification</h2>
        <p>Use the OTP below to verify your email address. It is valid for <strong>10 minutes</strong>.</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #392759; margin: 24px 0;">
          ${otp}
        </div>
        <p style="color: #888; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  try {
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
  } catch (error) {
    const msg =
      error?.response?.data?.message ||
      error?.response?.data ||
      error?.message ||
      "Unknown error";
    throw new Error(`OTP email send failed: ${msg}`);
  }
};

module.exports = { sendOTPEmail };
