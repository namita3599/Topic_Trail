const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // TTL index: MongoDB automatically deletes the document after 5 minutes (300 seconds)
    expires: 300,
  },
});

module.exports = mongoose.model("Otp", otpSchema);
