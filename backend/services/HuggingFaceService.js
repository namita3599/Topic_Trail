const https = require("https");
const { HfInference } = require("@huggingface/inference");
const axios = require("axios");

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // Disable SSL verification

const HUGGINGFACE_API_KEY = "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";

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
          content: `[Strictly adhere to the formatting rules] Your reply should be in JSON format where each key is a topic and the value of the key is the topic's summary. ALL TOPICS SHOULD HAVE A CORRESPONDING SUMMARY.THE SUMMARY SHOULD BE A BREIF OF WHAT'S INSIDE THE TEXT(PHRASE IT LIKE: The instructr says that...) The topics should be chronological according to the lecture script I am providing (Don't create useless topics they should be relevant to the topics). Descriptive 100 words of summary for each topic. Text: "${text}"`,
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
    console.error("Full error:", error);
    throw new Error("Summary generation failed");
  }
}

async function generateMCQs(text) {
  if (!text) {
    throw new Error("Text content is required");
  }

  try {
    const response = await client.chatCompletion({
      model: "mistralai/Mistral-7B-Instruct-v0.3",
      messages: [
        {
          role: "user",
          content: `[Strictly follow these formatting rules] Based on the provided lecture text, generate 10 multiple choice questions. Each question should:
          1. Test understanding rather than mere recall
          2. Have exactly 4 options
          3. Have only one correct answer
          4. Include an explanation for why the correct answer is right
          
          Return the response in this exact JSON format (don't make any mistake in the brackets , keep it json valid):
          //START OF FORMAT//
         {
  "mcqs": [
    {
      "question": "Clear, specific question text",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswerIndex": 0,
      "explanation": "Brief explanation of why the correct answer is right"
    },
    {
      same for next question
    }
  ]
}
   //END OF FORMAT//       
          Make sure:
          - Questions are well-distributed across different topics
          - Each question tests a single clear CONCEPT ,not something which happened in the lecture but something relevant to the topic .
          - Options are plausible but with only one clearly correct answer
          - Explanations are concise but informative
          
          Lecture text: "${text}"`,
        },
      ],
      max_tokens: 4000,
    });

    if (!response || !response.choices || !response.choices.length) {
      throw new Error("Invalid response from Hugging Face API");
    }

    const mcqContent =
      response.choices[0].message.content || "No MCQs generated.";
    return parseMCQResponse(mcqContent);
  } catch (error) {
    console.error("HuggingFace MCQ Generation error:", error.message);
    console.error("Full error:", error);
    throw new Error("MCQ generation failed");
  }
}

function parseStructuredSummary(content) {
  try {
    console.log("Raw Summary Content:", content);

    let jsonContent;
    if (typeof content === "string") {
      const cleanContent = content.trim().replace(/```json\s*|\s*```/g, "");
      jsonContent = JSON.parse(cleanContent);
    } else {
      jsonContent = content;
    }

    const result = Object.entries(jsonContent).map(([title, content]) => ({
      title: title.trim(),
      content: content.trim(),
    }));

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

    console.log("Final Processed Summary Result:", result);

    if (result.length === 0) {
      throw new Error("No topics and summaries could be extracted");
    }

    return result;
  } catch (error) {
    console.error("Summary parsing error:", error);
    throw new Error(`Failed to parse structured summary: ${error.message}`);
  }
}

function parseMCQResponse(content) {
  try {
    console.log("Raw MCQ Content:", content);

    let jsonContent;
    if (typeof content === "string") {
      const cleanContent = content.trim().replace(/```json\s*|\s*```/g, "");
      jsonContent = JSON.parse(cleanContent);
    } else {
      jsonContent = content;
    }

    if (!jsonContent.mcqs || !Array.isArray(jsonContent.mcqs)) {
      throw new Error("Invalid MCQ format: mcqs must be an array");
    }

    const mcqs = jsonContent.mcqs.map((mcq, index) => {
      // Validate each MCQ
      if (
        !mcq.question ||
        !Array.isArray(mcq.options) ||
        mcq.options.length !== 4 ||
        typeof mcq.correctAnswerIndex !== "number" ||
        mcq.correctAnswerIndex < 0 ||
        mcq.correctAnswerIndex > 3 ||
        !mcq.explanation
      ) {
        throw new Error(`Invalid MCQ format at index ${index}`);
      }

      return {
        question: mcq.question.trim(),
        options: mcq.options.map((opt) => opt.trim()),
        correctAnswerIndex: mcq.correctAnswerIndex,
        explanation: mcq.explanation.trim(),
      };
    });

    console.log("Final Processed MCQ Result:", mcqs);

    if (mcqs.length === 0) {
      throw new Error("No MCQs could be extracted");
    }

    return mcqs;
  } catch (error) {
    console.error("MCQ parsing error:", error);
    throw new Error(`Failed to parse MCQs: ${error.message}`);
  }
}

module.exports = {
  generateStructuredSummary,
  generateMCQs,
};
