const { HfInference } = require("@huggingface/inference");
const https = require("https");

class HuggingFaceService {
  static #client;

  static initialize() {
    if (!process.env.HUGGINGFACE_API_KEY) {
      throw new Error("HUGGINGFACE_API_KEY environment variable is not set");
    }

    // Create HTTPS agent with SSL verification disabled
    const agent = new https.Agent({
      rejectUnauthorized: false,
    });

    // Initialize the HuggingFace client
    this.#client = new HfInference(process.env.HUGGINGFACE_API_KEY, { agent });
  }

  static async generateStructuredSummary(text) {
    if (!this.#client) {
      this.initialize();
    }

    if (!text) {
      throw new Error("Text content is required");
    }

    try {
      const response = await this.#client.chatCompletion({
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        messages: [
          {
            role: "user",
            content: `[Strictly adhere to the formatting rules]Your response should start with a topics list: <T><1>Topic one</1><2>Topic two</2></T> , after endning the topics list wiht /T start the summary list,<A><1>Summary of topic one</1><2>Summary of topic two</2></A>.The topics should be chronological accroding to the lecture script I am providing.Descriptive 100 words of summary for each topic. Text: "${text}"`,
          },
        ],
        max_tokens: 4000,
      });

      const summary =
        response.choices[0]?.message?.content || "No summary generated.";
      return this.parseStructuredSummary(summary);
    } catch (error) {
      console.error(
        "HuggingFace API error:",
        error.response?.data || error.message
      );
      throw new Error("Summary generation failed");
    }
  }

  static parseStructuredSummary(content) {
    try {
      // Extract topics
      const topicsMatch = content.match(/<T>(.*?)<\/T>/s);
      const summariesMatch = content.match(/<A>(.*?)<\/A>/s);

      if (!topicsMatch || !summariesMatch) {
        throw new Error("Invalid summary format");
      }

      const topics = [];
      const topicRegex = /<(\d+)>(.*?)<\/\1>/g;
      const summaryRegex = /<(\d+)>(.*?)<\/\1>/g;

      let match;
      const topicsList = [];
      const summariesList = [];

      // Extract topics
      while ((match = topicRegex.exec(topicsMatch[1])) !== null) {
        topicsList.push({
          index: parseInt(match[1]),
          content: match[2].trim(),
        });
      }

      // Extract summaries
      while ((match = summaryRegex.exec(summariesMatch[1])) !== null) {
        summariesList.push({
          index: parseInt(match[1]),
          content: match[2].trim(),
        });
      }

      // Combine topics and summaries
      topicsList.forEach((topic) => {
        const summary = summariesList.find((s) => s.index === topic.index);
        if (summary) {
          topics.push({
            title: topic.content,
            content: summary.content,
          });
        }
      });

      return topics;
    } catch (error) {
      console.error("Parsing error:", error.message);
      throw new Error("Failed to parse structured summary");
    }
  }
}

module.exports = HuggingFaceService;
