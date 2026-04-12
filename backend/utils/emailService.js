const nodemailer = require("nodemailer");

const normalizeAddress = (address) => {
  return String(address || "")
    .trim()
    .toLowerCase()
    .replace(/^.*</, "")
    .replace(/>.*$/, "");
};

const getSanitizedEmailConfig = () => {
  const emailUser = (process.env.EMAIL_USER || process.env.SMTP_USER || "")
    .trim();
  const emailPass = (process.env.EMAIL_PASS || process.env.SMTP_PASS || "")
    .trim()
    .replace(/\s+/g, "");
  const emailHost = (process.env.EMAIL_HOST || "smtp.gmail.com").trim();
  const emailPort = Number(process.env.EMAIL_PORT || 587);
  const emailSecure =
    String(process.env.EMAIL_SECURE || "false").toLowerCase() === "true";

  if (!emailUser || !emailPass) {
    throw new Error("EMAIL_USER and EMAIL_PASS must be set for OTP emails");
  }

  if (Number.isNaN(emailPort)) {
    throw new Error("EMAIL_PORT must be a valid number");
  }

  return {
    emailUser,
    emailPass,
    emailHost,
    emailPort,
    emailSecure,
  };
};

const createTransporter = (config) => {
  return nodemailer.createTransport({
    host: config.emailHost,
    port: config.emailPort,
    secure: config.emailSecure,
    auth: {
      user: config.emailUser,
      pass: config.emailPass,
    },
  });
};

const sendOTPEmail = async (email, otp) => {
  const config = getSanitizedEmailConfig();
  const transporter = createTransporter(config);

  const mailOptions = {
    from: config.emailUser,
    to: email,
    subject: "Email Verification OTP",
    html: `
            <h1>Email Verification</h1>
            <p>Your OTP for email verification is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 10 minutes.</p>
        `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const rejectedRecipients = Array.isArray(info.rejected) ? info.rejected : [];
    const normalizedRecipient = normalizeAddress(email);
    const rejected = rejectedRecipients.map(normalizeAddress);

    if (rejected.includes(normalizedRecipient)) {
      throw new Error("SMTP server rejected recipient address");
    }

    return info;
  } catch (error) {
    throw new Error(`OTP email send failed: ${error.message}`);
  }
};

module.exports = { sendOTPEmail };
