require("dotenv").config();
const QwenService = require("./QwenService");

async function testQwenService() {
  // Sample transcription for testing
  const sampleTranscription = `
    Hello everyone! Today we're going to talk about JavaScript frameworks.
    First, let's discuss React. React is a popular frontend library developed by Facebook.
    It uses a virtual DOM and component-based architecture.
    
    Next up is Vue.js. Vue is known for its gentle learning curve and flexible architecture.
    It combines the best parts of React and Angular.
    
    Finally, let's look at Svelte. Svelte takes a different approach by compiling components
    at build time instead of using a virtual DOM at runtime.
  `;

  try {
    console.log("Testing QwenService...");
    console.log("Sending transcription to Qwen API...");

    const topics = await QwenService.generateSummary(sampleTranscription);

    console.log("\nGenerated Topics:");
    console.log(JSON.stringify(topics, null, 2));
  } catch (error) {
    console.error("Test failed:", error.message);
    if (error.response?.data) {
      console.error("API Error Details:", error.response.data);
    }
  }
}

// Run the test
testQwenService();
