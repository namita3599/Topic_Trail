const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");
const UserModel = require("../Models/User");
const { sendOTPEmail } = require("../utils/emailService");
const { generateOTP } = require("../utils/otpUtil");

const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedName = String(name || "").trim();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
        success: false,
      });
    }

    const user = await UserModel.findOne({ email: normalizedEmail });

    if (user) {
      return res
        .status(409)
        .json({ message: "User already exists", success: false });
    }

    // Generate OTP and set expiry
    const otp = generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // OTP valid for 10 minutes

    // Send OTP email first. Persist user only after delivery is accepted.
    try {
      await sendOTPEmail(normalizedEmail, otp);
    } catch (emailError) {
      console.error("OTP email send failed:", emailError.message);
      return res.status(502).json({
        message:
          "Signup could not be completed because OTP email delivery failed. Please try again.",
        success: false,
      });
    }

    // Create user with unverified status after OTP email succeeds
    const userModel = new UserModel({
      name: normalizedName,
      email: normalizedEmail,
      password: await bcryptjs.hash(password, 10),
      otp,
      otpExpiry,
      isVerified: false,
    });

    try {
      await userModel.save();
    } catch (saveError) {
      if (saveError?.code === 11000) {
        return res.status(409).json({
          message: "User already exists",
          success: false,
        });
      }
      throw saveError;
    }

    res.status(201).json({
      message: "Signup successful. Please verify your email with the OTP sent.",
      success: true,
      requiresVerification: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: err.message || "Internal server error",
      success: false,
    });
  }
};

// 5. Add verify OTP endpoint
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) {
      return res
        .status(404)
        .json({ message: "User not found", success: false });
    }

    if (user.isVerified) {
      return res
        .status(400)
        .json({ message: "Email already verified", success: false });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP", success: false });
    }

    if (new Date() > user.otpExpiry) {
      return res
        .status(400)
        .json({ message: "OTP has expired", success: false });
    }

    // Verify user and clear OTP fields
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.status(200).json({
      message: "Email verified successfully",
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

// 6. Modify login to check for verification
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.findOne({ email });
    const errorMsg = "Auth failed email or password is wrong";

    if (!user) {
      return res.status(403).json({ message: errorMsg, success: false });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Email not verified. Please verify your email first.",
        success: false,
        requiresVerification: true,
      });
    }

    const isPassEqual = await bcryptjs.compare(password, user.password);
    if (!isPassEqual) {
      return res.status(403).json({ message: errorMsg, success: false });
    }

    const jwtToken = jwt.sign(
      { email: user.email, _id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    res.status(200).json({
      message: "Login Success",
      success: true,
      jwtToken,
      email,
      name: user.name,
      userId: user._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

module.exports = {
  signup,
  login,
  verifyOTP,
};
