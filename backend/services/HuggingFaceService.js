const https = require("https");
const { HfInference } = require("@huggingface/inference");
const axios = require("axios");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Disable SSL verification

const HUGGINGFACE_API_KEY = HUGGINGFACE_API_KEY;

// Create a client for Hugging Face Inference
const client = new HfInference(HUGGINGFACE_API_KEY);

async function generateStructuredSummary(text) {
  if (!text) {
    throw new Error("Text content is required");
  }

  try {
    // Request structured summary from the model
    const response = await client.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      messages: [
        {
          role: "user",
          content: `[Strictly adhere to the formatting rules] Your response should start with a topics list: <T><1>Topic one</1><2>Topic two</2></T>, after ending the topics list with </T> start the summary list, <A><1>Summary of topic one</1><2>Summary of topic two</2></A>.ALL THE TEXT SHOULD BE INSIDE THESE HTML LIKE DIVISONS.ALL TOPICS SHOULD HAVE A CORRESPONDING SUMMARY.THE SUMMARY SHOULD BE ACCCORDING TO THE SCRIPT (PHRASE IT LIKE: The instructr says that...) The topics should be chronological according to the lecture script I am providing. Descriptive 100 words of summary for each topic. Text: "${text}"`,
        },
      ],
      max_tokens: 4000,
    });

    if (!response || !response.choices || !response.choices.length) {
      throw new Error("Invalid response from Hugging Face API");
    }

    const structuredSummary =
      response.choices[0].message.content || "No summary generated.";
    return parseStructuredSummary(structuredSummary);
  } catch (error) {
    console.error("HuggingFace API error:", error.message);
    console.error("Full error:", error); // Log full error details
    throw new Error("Summary generation failed");
  }
}

function parseStructuredSummary(content) {
  try {
    console.log("Raw Summary Content:", content);

    // Remove newlines and extra spaces to make parsing easier
    const cleanContent = content.replace(/\n/g, " ").replace(/\s+/g, " ");

    // Extract sections
    const topicsSection = cleanContent.match(/<T>(.*?)<\/T>/s)?.[1].trim();
    const summariesSection = cleanContent.match(/<A>(.*?)<\/A>/s)?.[1].trim();

    console.log("Cleaned Topics Section:", topicsSection);
    console.log("Cleaned Summaries Section:", summariesSection);

    if (!topicsSection || !summariesSection) {
      throw new Error("Missing topics or summaries section");
    }

    // Split by numbered tags and filter out empty strings
    const topics = topicsSection.split(/<\d+>/).filter(Boolean);
    const summaries = summariesSection.split(/<\d+>/).filter(Boolean);

    console.log("Split Topics:", topics);
    console.log("Split Summaries:", summaries);

    // Create result array
    const result = topics.map((topic, index) => ({
      title: topic.trim(),
      content: summaries[index] ? summaries[index].trim() : "",
    }));

    console.log("Final Processed Result:", result);

    if (result.length === 0) {
      throw new Error("No topics and summaries could be extracted");
    }

    return result;
  } catch (error) {
    console.error("Parsing error:", error);
    throw new Error(`Failed to parse structured summary: ${error.message}`);
  }
}

module.exports = {
  generateStructuredSummary,
};
