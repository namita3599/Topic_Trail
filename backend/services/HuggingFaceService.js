require("dotenv").config();
const Groq = require("groq-sdk");
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// Initialize Groq client
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SUMMARY_WORD_TARGET = 100;

function chunkText(text, maxWords = 2000) {
  console.log("📏 Splitting text into chunks...");
  const words = text.split(/\s+/);
  const chunks = [];

  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(" "));
  }

  console.log(`📦 Created ${chunks.length} chunks of text`);
  return chunks;
}

async function generateStructuredSummary(text) {
  if (!text) {
    throw new Error("Text content is required");
  }

  try {
    console.log("🔍 Analyzing text length...");
    const words = text.split(/\s+/).length;
    console.log(`📊 Text contains ${words} words`);

    // If text is within limit, process normally
    if (words <= 2000) {
      console.log("✨ Text within limit, processing as single chunk");
      return await processSingleChunk(text);
    }

    console.log("🔄 Text exceeds limit, initiating chunk processing");
    const chunks = chunkText(text);
    let allResults = [];
    let lastTopic = null;

    // Process first chunk
    console.log("🎯 Processing first chunk...");
    const firstChunkResults = await processSingleChunk(chunks[0]);

    if (chunks.length === 1) {
      console.log("✅ Single chunk processed successfully");
      allResults = firstChunkResults;
    } else {
      console.log("📎 Storing first chunk results (excluding last topic)");
      allResults = firstChunkResults.slice(0, -1);
      lastTopic = firstChunkResults[firstChunkResults.length - 1];
    }

    // Process remaining chunks
    for (let i = 1; i < chunks.length; i++) {
      console.log(`🔄 Processing chunk ${i + 1} of ${chunks.length}`);
      const isLastChunk = i === chunks.length - 1;
      const chunkResults = await processChunkWithContext(chunks[i], lastTopic);

      if (isLastChunk) {
        console.log("🏁 Processing final chunk, keeping all topics");
        allResults = [...allResults, ...chunkResults];
      } else {
        console.log(
          "📎 Storing intermediate chunk results (excluding last topic)"
        );
        allResults = [...allResults, ...chunkResults.slice(0, -1)];
        lastTopic = chunkResults[chunkResults.length - 1];
      }
    }

    console.log(`✅ All chunks processed. Total topics: ${allResults.length}`);
    return allResults;
  } catch (error) {
    console.error("🚨 Processing error:", error.message);
    console.error("🔍 Full error:", error);
    // Keep the processing pipeline alive with a deterministic fallback summary.
    return buildFallbackSummary(text);
  }
}

async function requestGroqStructuredSummary(prompt) {
  const requestBody = {
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content:
          "Return only valid JSON. No markdown fences, no explanation text.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0.2,
  };

  try {
    const response = await groq.chat.completions.create({
      ...requestBody,
      response_format: { type: "json_object" },
    });
    return response;
  } catch (error) {
    // Some providers/models may not support response_format consistently.
    return groq.chat.completions.create(requestBody);
  }
}

async function processSingleChunk(text) {
  console.log("🎯 Processing chunk with Groq API...");
  const response = await requestGroqStructuredSummary(
    `[Strictly adhere to the formatting rules] Your reply should be in JSON format where each key is a topic and the value of the key is the topic's summary. ALL TOPICS SHOULD HAVE A CORRESPONDING SUMMARY. THE SUMMARY SHOULD BE A BRIEF OF WHAT'S INSIDE THE TEXT (PHRASE IT LIKE: The instructor says that...). The topics should be chronological according to the lecture script I am providing (Don't create useless topics they should be relevant to the topics). Descriptive ${SUMMARY_WORD_TARGET} words of summary for each topic. Text: "${text}"`
  );

  if (!response || !response.choices || !response.choices.length) {
    console.error("❌ Invalid response from Groq API");
    throw new Error("Invalid response from Groq API");
  }

  const structuredSummary =
    response.choices[0]?.message?.content || "No summary generated.";
  return parseStructuredSummary(structuredSummary);
}

async function processChunkWithContext(chunk, lastTopic) {
  console.log("🔄 Processing chunk with context...");
  console.log(`📌 Last topic: ${lastTopic ? lastTopic.title : "None"}`);

  const contextPrefix = lastTopic
    ? `Title: "${lastTopic.title}"
Summary: "${lastTopic.content}"

`
    : "";

  const response = await requestGroqStructuredSummary(
    `${contextPrefix}Alright ,  so above is the last topic/summary of the previous chunk of the transcription of this lecture video,
Now , I am giving you the continuation of that transcription,
You have to create topic and summary for the give continuation but i have given you the last topic/summary becasue i want you to take the decision that you either start with that topic(when the given continuation's start is about something new) or Start with this topic and summary and adding the additional details given in this continutaiton to the summary.
After that Generate a structured summary of the main educational content only. Ignore any:
        - Like and subscribe reminders
        - Sponsor segments
        - Video outro segments
        - Social media promotions
        - Merchandise promotions
        - Channel-related announcements
      
Your reply should be in JSON format where each key is a topic and the value of the key is the topic's summary. ALL TOPICS SHOULD HAVE A CORRESPONDING SUMMARY. The summary should be a brief of what's inside the text (phrase it like: The instructor says that...). The topics should be chronological according to the lecture script (Don't create useless topics - they should be relevant to the core educational content). Provide descriptive ${SUMMARY_WORD_TARGET} words of summary for each topic.
But this JSON should start with that initial decision's result only.

Text: "${chunk}"`
  );

  if (!response || !response.choices || !response.choices.length) {
    console.error("❌ Invalid response from Groq API");
    throw new Error("Invalid response from Groq API");
  }

  const structuredSummary =
    response.choices[0]?.message?.content || "No summary generated.";
  return parseStructuredSummary(structuredSummary);
}

function parseStructuredSummary(content) {
  try {
    console.log("📝 Raw Summary Content:", content);

    let jsonContent;
    if (typeof content === "string") {
      console.log("🧹 Cleaning JSON content...");
      const cleanContent = extractJsonString(content);
      jsonContent = JSON.parse(cleanContent);
    } else {
      jsonContent = content;
    }

    console.log("🔄 Converting to array format...");
    const result = normalizeSummaryPayload(jsonContent);

    console.log("✅ Validating topics and summaries...");
    result.forEach((item, index) => {
      if (!item.title || !item.content) {
        throw new Error(
          `Invalid summary item at index ${index}: missing title or content`
        );
      }

      if (typeof item.title !== "string" || typeof item.content !== "string") {
        throw new Error(
          `Invalid summary item at index ${index}: title and content must be strings`
        );
      }
    });

    console.log(`✨ Successfully processed ${result.length} topics`);

    if (result.length === 0) {
      throw new Error("No topics and summaries could be extracted");
    }

    return result;
  } catch (error) {
    console.error("❌ Summary parsing error:", error);
    throw new Error(`Failed to parse structured summary: ${error.message}`);
  }
}

function extractJsonString(raw) {
  const cleaned = String(raw)
    .trim()
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "");

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch (_error) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      JSON.parse(sliced);
      return sliced;
    }
    throw new Error("Model output did not contain valid JSON object");
  }
}

function normalizeSummaryPayload(payload) {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => ({
        title: String(item.title || item.topic || "").trim(),
        content: String(item.content || item.summary || "").trim(),
      }))
      .filter((item) => item.title && item.content);
  }

  if (payload && Array.isArray(payload.topics)) {
    return payload.topics
      .map((item) => ({
        title: String(item.title || item.topic || "").trim(),
        content: String(item.content || item.summary || "").trim(),
      }))
      .filter((item) => item.title && item.content);
  }

  return Object.entries(payload || {})
    .map(([title, content]) => ({
      title: String(title || "").trim(),
      content: String(content || "").trim(),
    }))
    .filter((item) => item.title && item.content);
}

function buildFallbackSummary(text) {
  console.log("🛟 Building fallback summary from transcript text...");
  const normalizedText = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalizedText) {
    return [];
  }

  const sentences = normalizedText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length === 0) {
    return [
      {
        title: "Transcript Overview",
        content: normalizedText,
      },
    ];
  }

  const chunkSize = 8;
  const fallback = [];

  for (let i = 0; i < sentences.length; i += chunkSize) {
    const chunk = sentences.slice(i, i + chunkSize).join(" ");
    const words = chunk.split(/\s+/).slice(0, SUMMARY_WORD_TARGET).join(" ");
    fallback.push({
      title: `Topic ${fallback.length + 1}`,
      content: words,
    });
  }

  return fallback;
}

module.exports = {
  generateStructuredSummary,
};
