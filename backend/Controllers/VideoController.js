const VideoModel = require("../Models/Video");
const ClassModel = require("../Models/Class");
const CloudinaryService = require("../services/CloudinaryService");
const { processVideo } = require("../utils/VideoProcessing");

const cloudinaryService = new CloudinaryService();

const VideoController = {
  upload: cloudinaryService.upload.single("video"),

  async uploadVideo(req, res) {
    try {
      const { title, description, classId } = req.body;
      const videoFile = req.file;

      if (!videoFile) {
        return res.status(400).json({ error: "No video file provided" });
      }

      // Check if class exists and user is the creator
      const classDoc = await ClassModel.findById(classId);
      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      // Verify if the user is the creator of the class
      if (classDoc.creator.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ error: "Only class creators can upload videos" });
      }

      // Upload to Cloudinary
      const cloudinaryResult = await CloudinaryService.uploadVideo(videoFile);
      console.log("Cloudinary upload completed:", cloudinaryResult);

      // Create video document with thumbnail
      const video = new VideoModel({
        title,
        description,
        cloudinaryUrl: cloudinaryResult.url,
        thumbnailUrl: cloudinaryResult.thumbnailUrl,
        classId,
        creator: req.user._id,
        duration: cloudinaryResult.duration || 0,
        processingStatus: "pending",
      });
      await video.save();

      // Clean up temporary file
      await CloudinaryService.cleanup(videoFile.path);

      // Start processing pipeline
      processVideo(video._id).catch(console.error);

      res.status(201).json({
        message: "Video upload successful",
        videoId: video._id,
        status: "processing",
      });
    } catch (error) {
      console.error("Upload error:", error);
      if (req.file) {
        await CloudinaryService.cleanup(req.file.path);
      }
      res.status(500).json({
        error: "Upload failed",
        details: error.message,
      });
    }
  },

  async getClassVideos(req, res) {
    try {
      const { classId } = req.params;
      const videos = await VideoModel.find({ classId })
        .sort("-createdAt")
        .select("-processingError");
      res.json(videos);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch videos" });
    }
  },

  async getVideo(req, res) {
    try {
      const video = await VideoModel.findById(req.params.videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.json(video);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch video" });
    }
  },

  async deleteVideo(req, res) {
    try {
      const video = await VideoModel.findById(req.params.videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Check if class exists and user is the creator
      const classDoc = await ClassModel.findById(video.classId);
      if (!classDoc) {
        return res.status(404).json({ error: "Class not found" });
      }

      // Verify if the user is the creator of the class
      if (classDoc.creator.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ error: "Only class creators can delete videos" });
      }

      const publicId = CloudinaryService.getPublicIdFromUrl(
        video.cloudinaryUrl
      );
      await CloudinaryService.deleteVideo(publicId);
      await video.deleteOne();

      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Delete failed" });
    }
  },

  async searchVideos(req, res) {
    try {
      // Extract query and classId from request
      const { query, classId } = req.query;
      console.log("Request URL:", req.originalUrl);
      console.log("Request Method:", req.method);
      console.log("Request Headers:", req.headers);
      // Log incoming parameters
      console.log("Search request received:");
      console.log("Query:", query);
      console.log("Class ID:", classId);

      // Validate query and classId
      if (!query || !classId) {
        console.warn("Missing search query or class ID");
        return res
          .status(400)
          .json({ error: "Missing search query or class ID" });
      }

      // Log before validating classId
      console.log("Validating class ID...");

      // Validate classId format (assuming MongoDB ObjectId)
      const mongoose = require("mongoose");
      if (!mongoose.Types.ObjectId.isValid(classId)) {
        console.warn("Invalid class ID format:", classId);
        return res.status(400).json({ error: "Invalid class ID" });
      }

      // Prepare the search regex
      const searchRegex = new RegExp(query, "i");
      console.log("Search Regex:", searchRegex);

      // Log before performing the database query
      console.log("Performing database query...");

      // Find videos matching the query
      const videos = await VideoModel.find({
        classId,
        $or: [
          { title: searchRegex },
          { summary: { $exists: true, $elemMatch: { title: searchRegex } } },
        ],
      }).sort("-createdAt");

      // Log after the query
      console.log("Query results:");
      console.log("Total Videos Found:", videos.length);

      // Separate videos into title matches and topic matches
      const titleMatches = videos.filter((video) =>
        searchRegex.test(video.title)
      );
      console.log("Title Matches:", titleMatches.length);

      const topicMatches = videos.filter(
        (video) =>
          !searchRegex.test(video.title) &&
          video.summary &&
          video.summary.some((item) => searchRegex.test(item.title))
      );
      console.log("Topic Matches:", topicMatches.length);

      // Send the response
      res.json({
        titleMatches,
        topicMatches,
      });
    } catch (error) {
      // Log the error
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed", details: error.message });
    }
  },
  // Add to VideoController
  async addNote(req, res) {
    try {
      const { videoId } = req.params;
      const { heading, content } = req.body;

      const video = await VideoModel.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      video.notes.push({
        heading,
        content,
        userId: req.user._id,
      });

      await video.save();
      res.status(201).json(video.notes[video.notes.length - 1]);
    } catch (error) {
      res.status(500).json({ error: "Failed to add note" });
    }
  },

  async getNotes(req, res) {
    try {
      const { videoId } = req.params;
      const video = await VideoModel.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      const userNotes = video.notes.filter(
        (note) => note.userId.toString() === req.user._id.toString()
      );
      res.json(userNotes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  },
};

module.exports = VideoController;
