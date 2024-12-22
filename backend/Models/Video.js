const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SummaryItemSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
});

const VideoSchema = new Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  cloudinaryUrl: {
    type: String,
    required: true,
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "classes",
    required: true,
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  transcription: {
    type: String,
    default: null,
  },
  summary: [SummaryItemSchema],
  duration: {
    type: Number,
    default: 0,
  },
  processingStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },
  processingError: {
    type: String,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

VideoSchema.index({ classId: 1, createdAt: -1 });

const VideoModel = mongoose.model("videos", VideoSchema);
module.exports = VideoModel;
