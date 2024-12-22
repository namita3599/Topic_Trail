const HuggingFaceService = require("./HuggingFaceService");

const TEST_TEXT = `An API (Application Programming Interface) is a set of defined rules and protocols that allow different software applications to communicate and interact with each other. APIs play a crucial role in modern software development by enabling seamless integration between disparate systems, platforms, or services. Essentially, an API acts as a bridge between two software systems, allowing them to exchange data and functionality without needing to know the underlying code or architecture of the other system. This abstraction simplifies development, promotes modularity, and enhances the scalability of applications.

APIs can be categorized into several types based on their use cases: RESTful APIs, SOAP APIs, GraphQL APIs, and WebSocket APIs, among others. RESTful APIs, which are based on the Representational State Transfer architectural style, are among the most popular due to their simplicity and scalability. They use standard HTTP methods like GET, POST, PUT, and DELETE to perform operations on resources identified by URLs. GraphQL, a relatively newer standard, allows clients to query only the data they need, offering more flexibility compared to REST. SOAP (Simple Object Access Protocol) is an older protocol that offers robust security and is often used in enterprise-level applications. WebSocket APIs are employed for real-time, two-way communication, such as in chat applications or live data streaming.

One of the key advantages of APIs is that they enable interoperability. For example, a payment gateway API like Stripe allows e-commerce websites to integrate secure payment processing without building the functionality from scratch. Similarly, APIs from social media platforms like Twitter or Facebook enable developers to embed features such as login buttons, posts, or feeds directly into their applications.

APIs also foster innovation by enabling developers to build on top of existing platforms. For instance, developers can use mapping APIs like Google Maps to integrate geolocation services into mobile apps or web applications. Cloud services APIs from providers like AWS, Microsoft Azure, or Google Cloud allow developers to tap into extensive computing, storage, and machine learning capabilities without managing physical infrastructure.

Security is a critical concern when designing and using APIs. To ensure that only authorized users can access the API, developers implement authentication mechanisms such as OAuth, API keys, or JSON Web Tokens (JWTs). Rate limiting and IP whitelisting are often used to prevent abuse and ensure fair usage.

Another benefit of APIs is that they enable microservices architecture, where an application is broken into smaller, independent services that communicate via APIs. This approach enhances scalability, flexibility, and fault isolation, making it easier to update or replace individual components without affecting the entire system.

In today’s interconnected digital landscape, APIs are the backbone of software ecosystems. They power everything from mobile apps and SaaS platforms to IoT devices and machine learning models. By facilitating communication between different systems, APIs not only save development time but also unlock new possibilities for innovation, collaboration, and efficiency. Whether you're a developer building a small application or an enterprise architect designing a complex system, APIs are indispensable tools in creating scalable, flexible, and modern software solutions.`;

async function testHuggingFaceService() {
  try {
    console.log("Generating structured summary...");
    const startTime = Date.now();

    const summary = await HuggingFaceService.generateStructuredSummary(
      TEST_TEXT
    );

    const endTime = Date.now();
    console.log(`Summary generated in ${(endTime - startTime) / 1000} seconds`);

    console.log("\nStructured Summary:");
    console.log("==================");
    summary.forEach((topic, index) => {
      console.log(`\nTopic ${index + 1}: ${topic.title}`);
      console.log("-".repeat(40));
      console.log(topic.content);
    });
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Run the test
console.log("Starting HuggingFace Service Test...");
testHuggingFaceService()
  .then(() => {
    console.log("\nTest completed.");
  })
  .catch((error) => {
    console.error("Test failed:", error);
  });
