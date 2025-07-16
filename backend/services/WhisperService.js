require("dotenv").config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const axios = require("axios");
const FormData = require("form-data");
const ffmpeg = require("fluent-ffmpeg");
const { Readable } = require("stream");
const tmp = require("tmp-promise");
const fs = require("fs").promises;
const { promisify } = require("util");
const path = require("path");

class WhisperService {
  static async transcribe(audioBuffer) {
    let tempFiles = [];
    try {
      console.log("\n🎯 Starting transcription process...");
      console.log(
        `📊 Input audio size: ${(audioBuffer.length / (1024 * 1024)).toFixed(
          2
        )} MB`
      );

      // First, normalize the audio to ensure it's in a format ffmpeg can read reliably
      const normalizedAudioPath = await this.normalizeAudio(audioBuffer);
      tempFiles.push(normalizedAudioPath);

      // Get audio duration using ffmpeg
      const duration = await this.getAudioDuration(normalizedAudioPath);
      console.log(`⏱️  Actual audio duration: ${duration.toFixed(2)} minutes`);

      // If audio is under 4 minutes, use original method
      if (duration <= 4) {
        console.log(
          "📝 Audio is under 4 minutes, processing as single chunk..."
        );
        return await this.sendTranscriptionRequest(audioBuffer);
      }

      // Otherwise, split the audio
      console.log("✂️  Audio is over 4 minutes, starting splitting process...");
      const chunks = await this.splitAudio(normalizedAudioPath, duration);
      console.log(`📦 Created ${chunks.length} chunks`);

      const transcriptions = await this.processChunks(chunks);
      console.log("\n🔄 All chunks processed successfully");

      // Combine transcriptions
      console.log("🎯 Combining transcriptions...");
      const finalTranscription = this.combineTranscriptions(transcriptions);
      console.log(
        `📊 Final transcription length: ${finalTranscription.length} characters`
      );

      return finalTranscription;
    } catch (error) {
      console.error("\n❌ Transcription failed:");
      console.error("Error details:", error.response?.data || error.message);
      throw error;
    } finally {
      // Cleanup all temporary files
      for (const file of tempFiles) {
        try {
          await fs.unlink(file);
        } catch (err) {
          console.error(`Failed to delete temporary file ${file}:`, err);
        }
      }
    }
  }

  static async normalizeAudio(audioBuffer) {
    const inputPath = path.join(process.cwd(), `temp_input_${Date.now()}.mp3`);
    const outputPath = path.join(
      process.cwd(),
      `temp_normalized_${Date.now()}.mp3`
    );

    try {
      // Write the input buffer to a temporary file
      await fs.writeFile(inputPath, audioBuffer);

      // Convert to a standard format that ffmpeg can reliably read
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .toFormat("mp3")
          .on("error", (err) => {
            console.error("Error during audio normalization:", err);
            reject(err);
          })
          .on("end", () => resolve())
          .save(outputPath);
      });

      return outputPath;
    } catch (error) {
      throw new Error(`Audio normalization failed: ${error.message}`);
    } finally {
      // Clean up input file
      try {
        await fs.unlink(inputPath);
      } catch (err) {
        console.error("Failed to delete input temp file:", err);
      }
    }
  }

  static async getAudioDuration(audioPath) {
    try {
      const getDuration = () =>
        new Promise((resolve, reject) => {
          ffmpeg.ffprobe(audioPath, (err, metadata) => {
            if (err) {
              reject(err);
              return;
            }

            if (
              !metadata ||
              !metadata.format ||
              typeof metadata.format.duration !== "number"
            ) {
              reject(new Error("Could not extract duration from audio file"));
              return;
            }

            // Convert duration from seconds to minutes
            resolve(metadata.format.duration / 60);
          });
        });

      return await getDuration();
    } catch (error) {
      console.error("Error getting audio duration:", error);

      // Fallback method: try to get duration using ffmpeg
      try {
        console.log("Attempting fallback duration detection...");
        const duration = await new Promise((resolve, reject) => {
          ffmpeg(audioPath)
            .on("end", resolve)
            .on("error", reject)
            .ffprobe((err, data) => {
              if (err) reject(err);
              resolve(data.streams[0].duration / 60);
            });
        });

        if (!duration || duration <= 0) {
          throw new Error("Invalid duration detected");
        }

        return duration;
      } catch (fallbackError) {
        throw new Error(
          `Failed to detect audio duration: ${fallbackError.message}`
        );
      }
    }
  }

  static async splitAudio(audioPath, totalDuration) {
    const CHUNK_DURATION = 3.5; // minutes
    const numChunks = Math.ceil(totalDuration / CHUNK_DURATION);
    const chunks = [];

    try {
      for (let i = 0; i < numChunks; i++) {
        const startTime = i * CHUNK_DURATION * 60; // convert to seconds
        const outputPath = path.join(
          process.cwd(),
          `chunk_${i}_${Date.now()}.mp3`
        );

        await new Promise((resolve, reject) => {
          ffmpeg(audioPath)
            .setStartTime(startTime)
            .setDuration(CHUNK_DURATION * 60)
            .output(outputPath)
            .on("end", resolve)
            .on("error", reject)
            .run();
        });

        const chunkBuffer = await fs.readFile(outputPath);
        chunks.push(chunkBuffer);

        // Clean up chunk file
        await fs.unlink(outputPath);

        console.log(
          `📦 Created chunk ${i + 1}/${numChunks}: ${(
            chunkBuffer.length /
            (1024 * 1024)
          ).toFixed(2)} MB`
        );
      }

      return chunks;
    } catch (error) {
      throw new Error(`Audio splitting failed: ${error.message}`);
    }
  }

  static async sendTranscriptionRequest(audioBuffer) {
    console.log(
      `\n🌐 Sending API request for chunk of size ${(
        audioBuffer.length / (1024 * 1024)
      ).toFixed(2)} MB...`
    );

    const startTime = Date.now();

    const response = await axios.post(
      process.env.HUGGINGFACE_WHISPER_URL,
      audioBuffer, // send raw buffer
      {
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "audio/mpeg", // or "audio/wav" if you send wav files
          Accept: "application/json",
        },
        maxBodyLength: Infinity,
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ API request completed in ${duration} seconds`);

    return response.data.text;
  }

  static async processChunks(chunks) {
    const transcriptions = [];
    console.log("\n🎯 Starting sequential chunk processing...");

    for (let i = 0; i < chunks.length; i++) {
      console.log(`\n📝 Processing chunk ${i + 1} of ${chunks.length}`);
      const transcription = await this.sendTranscriptionRequest(chunks[i]);
      transcriptions.push(transcription);

      console.log(
        `✅ Chunk ${i + 1} transcription length: ${
          transcription.length
        } characters`
      );

      if (i < chunks.length - 1) {
        console.log("⏳ Waiting 1 second before next chunk...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    return transcriptions;
  }

  static combineTranscriptions(transcriptions) {
    const combined = transcriptions.join(" ").replace(/\s+/g, " ").trim();
    console.log(
      `\n✨ Successfully combined ${transcriptions.length} transcriptions`
    );
    return combined;
  }
}

module.exports = WhisperService;