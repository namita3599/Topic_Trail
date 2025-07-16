const VideoModel = require("../Models/Video");
const ClassModel = require("../Models/Class");
const CloudinaryService = require("../services/CloudinaryService");
const { processVideo } = require("../utils/VideoProcessing");
const GroqService = require("../services/GroqService");
const groqService = new GroqService();
const Groq = require("groq-sdk");
const cloudinary = require("cloudinary").v2;

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
        public_id: cloudinaryResult.public_id,
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

      await CloudinaryService.deleteVideo(video.public_id);

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
  async updateSummary(req, res) {
    try {
      const { videoId } = req.params;
      const { summary } = req.body;

      const video = await VideoModel.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Verify if the user is the creator of the class
      const classDoc = await ClassModel.findById(video.classId);
      if (
        !classDoc ||
        classDoc.creator.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to edit summary" });
      }

      video.summary = summary;
      await video.save();

      res.json({
        message: "Summary updated successfully",
        summary: video.summary,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to update summary" });
    }
  },

  async deleteSummaryTopic(req, res) {
    try {
      const { videoId, topicId } = req.params;

      const video = await VideoModel.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Verify if the user is the creator of the class
      const classDoc = await ClassModel.findById(video.classId);
      if (
        !classDoc ||
        classDoc.creator.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to delete topic" });
      }

      video.summary = video.summary.filter(
        (topic) => topic._id.toString() !== topicId
      );
      await video.save();

      res.json({
        message: "Topic deleted successfully",
        summary: video.summary,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete topic" });
    }
  },
  async generateQuiz(req, res) {
    try {
      const { videoId } = req.params;
      const { numberOfQuestions, difficulty, additionalInstructions } =
        req.body;

      // Input validation
      if (!numberOfQuestions || !difficulty) {
        return res.status(400).json({
          error:
            "Missing required fields: numberOfQuestions and difficulty are required",
        });
      }

      // Validate numberOfQuestions
      const questionsCount = parseInt(numberOfQuestions);
      if (isNaN(questionsCount) || questionsCount < 1 || questionsCount > 20) {
        return res.status(400).json({
          error: "numberOfQuestions must be between 1 and 20",
        });
      }

      // Validate difficulty
      const validDifficulties = ["easy", "medium", "hard"];
      if (!validDifficulties.includes(difficulty.toLowerCase())) {
        return res.status(400).json({
          error: "difficulty must be one of: easy, medium, hard",
        });
      }

      // Get video and verify existence
      const video = await VideoModel.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Check if video has summary
      if (!video.summary || video.summary.length === 0) {
        return res.status(400).json({
          error: "Video does not have a summary to generate quiz from",
        });
      }

      // Update quiz generation status
      video.mcqGenerationStatus = "processing";
      await video.save();

      // Generate quiz using Groq
      const quiz = await groqService.generateQuiz(
        video.summary,
        questionsCount,
        difficulty,
        additionalInstructions
      );

      // Update video with new MCQs
      video.mcqs = quiz.mcqs;
      video.mcqGenerationStatus = "completed";
      await video.save();

      res.json({
        message: "Quiz generated successfully",
        mcqs: quiz.mcqs,
      });
    } catch (error) {
      console.error("Quiz generation error:", error);

      // Update status to failed if there was an error
      if (req.params.videoId) {
        try {
          const video = await VideoModel.findById(req.params.videoId);
          if (video) {
            video.mcqGenerationStatus = "failed";
            await video.save();
          }
        } catch (updateError) {
          console.error("Error updating video status:", updateError);
        }
      }

      res.status(500).json({
        error: "Failed to generate quiz",
        details: error.message,
      });
    }
  },

  async addAssignment(req, res) {
    try {
      const { videoId } = req.params;
      const { question } = req.body;

      if (!question) {
        return res
          .status(400)
          .json({ error: "Assignment question is required" });
      }

      const video = await VideoModel.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Verify if the user is the creator of the class
      const classDoc = await ClassModel.findById(video.classId);
      if (
        !classDoc ||
        classDoc.creator.toString() !== req.user._id.toString()
      ) {
        return res
          .status(403)
          .json({ error: "Not authorized to add assignment" });
      }

      video.assignment = { question, submissions: [] };
      await video.save();

      res.json({
        message: "Assignment added successfully",
        assignment: video.assignment,
      });
    } catch (error) {
      console.error("Add assignment error:", error);
      res.status(500).json({
        error: "Failed to add assignment",
        details: error.message,
      });
    }
  },

  async getAssignment(req, res) {
    try {
      const { videoId } = req.params;
      const video = await VideoModel.findById(videoId);

      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      if (!video.assignment) {
        return res
          .status(404)
          .json({ error: "No assignment found for this video" });
      }

      res.json(video.assignment);
    } catch (error) {
      console.error("Get assignment error:", error);
      res.status(500).json({ error: "Failed to fetch assignment" });
    }
  },
  async submitAssignment(req, res) {
    try {
      const { videoId } = req.params;
      const submissionImage = req.file;

      // Fetch full user data from database
      const UserModel = require('../Models/User');  // Make sure to import your User model
      const user = await UserModel.findById(req.user._id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const video = await VideoModel.findById(videoId);
      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      if (!video.assignment?.question) {
        return res.status(400).json({ error: "No assignment exists for this video" });
      }

      const cloudinaryResult = await cloudinary.uploader.upload(
        submissionImage.path,
        {
          folder: "assignemtn",
          resource_type: "auto",
        }
      );
      const assessment = await getAssessmentFromGroq(video.assignment.question, cloudinaryResult.url);

      const submission = {
        userName: user.name || user.username || user.email || 'Anonymous User',
        submissionImage: cloudinaryResult.url,
        assessment,
        userId: user._id,
        createdAt: new Date()
      };

      video.assignment.submissions.push(submission);
      await video.save();

      await CloudinaryService.cleanup(submissionImage.path);

      res.json({
        message: "Assignment submitted successfully",
        submission
      });
    } catch (error) {
      console.error("Assignment submission error:", error);
      if (req.file) {
        await CloudinaryService.cleanup(req.file.path);
      }
      res.status(500).json({ 
        error: "Failed to submit assignment",
        details: error.message 
      });
    }
},
  // async submitAssignment(req, res) {
  //   try {
  //     const { videoId } = req.params;
  //     const submissionImage = req.file;

  //     if (!submissionImage) {
  //       return res.status(400).json({ error: "No image provided" });
  //     }

  //     const video = await VideoModel.findById(videoId);
  //     if (!video) {
  //       return res.status(404).json({ error: "Video not found" });
  //     }

  //     if (!video.assignment?.question) {
  //       return res
  //         .status(400)
  //         .json({ error: "No assignment exists for this video" });
  //     }

  //     // Check if user has already submitted
  //     const existingSubmission = video.assignment.submissions.find(
  //       (sub) => sub.userId.toString() === req.user._id.toString()
  //     );
  //     if (existingSubmission) {
  //       // Clean up uploaded file first
  //       await CloudinaryService.cleanup(submissionImage.path);
  //       return res
  //         .status(400)
  //         .json({ error: "You have already submitted an assignment" });
  //     }

  //     // Upload image to Cloudinary
  //     // const cloudinaryResult = await CloudinaryService.uploadImage(
  //     //   submissionImage.path
  //     // );
  //       const cloudinaryResult = await cloudinary.uploader.upload(
  //         submissionImage.path,
  //         {
  //           folder: "assignemtn",
  //           resource_type: "auto",
  //         }
  //       );

  //     // Get assessment from Groq Vision
  //     const assessment = await getAssessmentFromGroq(
  //       video.assignment.question,
  //       cloudinaryResult.url
  //     );

  //     // Create submission
  //     const submission = {
  //       userName: req.user.name,
  //       submissionImage: cloudinaryResult.url,
  //       assessment,
  //       userId: req.user._id,
  //       createdAt: new Date(),
  //     };

  //     // Add submission to video
  //     video.assignment.submissions.push(submission);
  //     await video.save();

  //     // Clean up temporary file
  //     await CloudinaryService.cleanup(submissionImage.path);

  //     res.json({
  //       message: "Assignment submitted successfully",
  //       submission,
  //     });
  //   } catch (error) {
  //     console.error("Assignment submission error:", error);
  //     if (req.file) {
  //       await CloudinaryService.cleanup(req.file.path);
  //     }
  //     res.status(500).json({
  //       error: "Failed to submit assignment",
  //       details: error.message,
  //     });
  //   }
  // },

  async getSubmissions(req, res) {
    try {
      const { videoId } = req.params;
      const video = await VideoModel.findById(videoId);

      if (!video) {
        return res.status(404).json({ error: "Video not found" });
      }

      // Check if user is class creator
      const classDoc = await ClassModel.findById(video.classId);
      const isCreator = classDoc.creator.toString() === req.user._id.toString();

      // If user is not creator, only return their submission
      if (!isCreator) {
        const userSubmission = video.assignment?.submissions.filter(
          (sub) => sub.userId.toString() === req.user._id.toString()
        );
        return res.json(userSubmission || []);
      }

      // Return all submissions for creator
      res.json(video.assignment?.submissions || []);
    } catch (error) {
      console.error("Get submissions error:", error);
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  },
};
async function getAssessmentFromGroq(question, imageUrl) {
  const groq = new Groq();
  
  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Assignment Question: ${question}\n\nPlease provide a detailed assessment of this submission. PointWise. Consider accuracy, completeness, and clarity in your evaluation. Provide specific feedback and suggestions for improvement where applicable.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      model: "llama-3.2-11b-vision-preview",
      temperature: 0.7,
      max_tokens: 1024,
    });

    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error('Groq assessment error:', error);
    throw new Error('Failed to get AI assessment');
  }
}


module.exports = VideoController;


