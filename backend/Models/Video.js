const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Add these schemas after the existing schemas in VideoSchema
const AssignmentSubmissionSchema = new Schema({
  userName: {
    type: String,
    required: true,
  },
  submissionImage: {
    type: String,  // Cloudinary URL
    required: true,
  },
  assessment: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  }
});

const NoteSchema = new Schema({
  heading: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
});

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

const MCQSchema = new Schema({
  question: {
    type: String,
    required: true,
  },
  options: [{
    type: String,
    required: true,
  }],
  correctAnswerIndex: {
    type: Number,
    required: true,
    min: 0,
  },
  explanation: {
    type: String,
    required: true,
  }
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
  thumbnailUrl: {
    type: String,
    default: null,
  },
  public_id: {
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
  mcqs: {
    type: [MCQSchema],
    default: [],
  },
  duration: {
    type: Number,
    default: 0,
  },
  processingStatus: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },
  mcqGenerationStatus: {
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
  notes: [NoteSchema],
  
  assignment: {
    question: {
      type: String,
      default: null,
    },
    submissions: [AssignmentSubmissionSchema],
  },
});

// Indexes for optimizing queries
VideoSchema.index({ classId: 1, createdAt: -1 });
VideoSchema.index({ title: "text" }); // Add text index for title search

const VideoModel = mongoose.model("videos", VideoSchema);
module.exports = VideoModel;