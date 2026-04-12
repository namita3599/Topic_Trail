const nodemailer = require("nodemailer");

const normalizeAddress = (address) => {
  return String(address || "")
    .trim()
    .toLowerCase()
    .replace(/^.*</, "")
    .replace(/>.*$/, "");
};

const getSanitizedEmailConfig = () => {
  const emailUser = (process.env.EMAIL_USER || "").trim();
  const emailPass = (process.env.EMAIL_PASS || "").trim().replace(/\s+/g, "");
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
    const acceptedRecipients = Array.isArray(info.accepted) ? info.accepted : [];
    const rejectedRecipients = Array.isArray(info.rejected) ? info.rejected : [];
    const normalizedRecipient = normalizeAddress(email);
    const accepted = acceptedRecipients.map(normalizeAddress);
    const rejected = rejectedRecipients.map(normalizeAddress);

    if (rejected.includes(normalizedRecipient)) {
      throw new Error("SMTP server rejected recipient address");
    }

    // Some providers may not echo back an exact accepted list; messageId is a strong success signal.
    if (!accepted.includes(normalizedRecipient) && !info.messageId) {
      throw new Error("SMTP did not confirm message delivery");
    }

    return info;
  } catch (error) {
    throw new Error(`OTP email send failed: ${error.message}`);
  }
};

module.exports = { sendOTPEmail };
