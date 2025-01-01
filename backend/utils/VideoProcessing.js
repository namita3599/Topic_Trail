const VideoModel = require("../Models/Video");
const AudioConverter = require("../Services/AudioConverter");
const WhisperService = require("../Services/WhisperService");
const HuggingFaceService = require("../Services/HuggingFaceService");

async function updateVideoStatus(videoId, status, error = null) {
  const updates = { processingStatus: status };
  if (error) updates.processingError = error;
  await VideoModel.findByIdAndUpdate(videoId, updates);
}

async function updateMCQStatus(videoId, status) {
  await VideoModel.findByIdAndUpdate(videoId, {
    mcqGenerationStatus: status
  });
}

async function generateAndSaveMCQs(videoId) {
  try {
    const video = await VideoModel.findById(videoId);
    if (!video || !video.transcription) {
      throw new Error("Video or transcription not found");
    }

    await updateMCQStatus(videoId, "processing");

    const mcqs = await HuggingFaceService.generateMCQs(video.transcription);
    
    await VideoModel.findByIdAndUpdate(videoId, {
      mcqs: mcqs,
      mcqGenerationStatus: "completed"
    });

    return mcqs;
  } catch (error) {
    console.error(`MCQ generation failed for video ${videoId}:`, error);
    await updateMCQStatus(videoId, "failed");
    throw error;
  }
}

async function processVideo(videoId) {
  try {
    const video = await VideoModel.findById(videoId);
    if (!video) throw new Error("Video not found");

    await updateVideoStatus(videoId, "processing");

    // Convert video to audio
    const audioBuffer = await AudioConverter.videoToAudio(video.cloudinaryUrl);

    // Get transcription
    const transcription = await WhisperService.transcribe(audioBuffer);
    await VideoModel.findByIdAndUpdate(videoId, { transcription });

    // Generate structured summary using HuggingFace
    const structuredSummary = await HuggingFaceService.generateStructuredSummary(transcription);
    await VideoModel.findByIdAndUpdate(videoId, {
      summary: structuredSummary,
      processingStatus: "completed",
    });

    // Start MCQ generation as a separate process
    // We use setTimeout to ensure it runs after the current process
    setTimeout(() => {
      generateAndSaveMCQs(videoId).catch(error => {
        console.error("MCQ generation failed:", error);
      });
    }, 1000);

  } catch (error) {
    console.error(`Processing failed for video ${videoId}:`, error);
    await updateVideoStatus(videoId, "failed", error.message);
    throw error;
  }
}

async function regenerateMCQs(videoId) {
  const video = await VideoModel.findById(videoId);
  if (!video) throw new Error("Video not found");

  // Clear existing MCQs
  await VideoModel.findByIdAndUpdate(videoId, {
    mcqs: [],
    mcqGenerationStatus: "pending"
  });

  // Generate new MCQs
  return generateAndSaveMCQs(videoId);
}

async function getVideoProcessingStatus(videoId) {
  const video = await VideoModel.findById(videoId).select('processingStatus mcqGenerationStatus');
  if (!video) throw new Error("Video not found");

  return {
    videoProcessing: video.processingStatus,
    mcqGeneration: video.mcqGenerationStatus
  };
}

module.exports = {
  processVideo,
  regenerateMCQs,
  getVideoProcessingStatus,
  generateAndSaveMCQs
};