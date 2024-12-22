const VideoModel = require("../Models/Video");
const AudioConverter = require("../Services/AudioConverter");
const WhisperService = require("../Services/WhisperService");
const LlamaService = require("../Services/LlamaService");

async function updateVideoStatus(videoId, status, error = null) {
  const updates = { processingStatus: status };
  if (error) updates.processingError = error;
  await VideoModel.findByIdAndUpdate(videoId, updates);
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

    // Generate summary
    const summary = await LlamaService.generateSummary(transcription);
    await VideoModel.findByIdAndUpdate(videoId, {
      summary,
      processingStatus: "completed",
    });
  } catch (error) {
    console.error(`Processing failed for video ${videoId}:`, error);
    await updateVideoStatus(videoId, "failed", error.message);
    throw error;
  }
}

module.exports = {
  processVideo,
};
