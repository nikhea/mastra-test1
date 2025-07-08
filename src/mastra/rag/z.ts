// import { MongoDBStorage } from "@mastra/mongodb";
// import { createRAGWorkflow } from "@mastra/rag";
// import { OpenAIEmbedder } from "@mastra/core"; // or your preferred embedder

// // 1. Connect to MongoDB
// const storage = new MongoDBStorage({
//   uri: "mongodb://localhost:27017",
//   dbName: "realestate",
//   collection: "listings",
// });

// // 2. Set up the embedder
// const embedder = new OpenAIEmbedder({ apiKey: process.env.OPENAI_API_KEY });

// // 3. Create the RAG workflow
// const ragWorkflow = createRAGWorkflow({
//   storage,
//   embedder,
//   fields: ["title", "description", "state", "area", "street"], // fields to index
//   search: {
//     type: "hybrid", // enables both similarity and autocomplete
//     autocompleteFields: ["title", "area", "state"],
//     similarityFields: ["description", "title"],
//   },
// });

// // 4. Query the workflow
// const results = await ragWorkflow.query({
//   query: "affordable land in Lagos",
//   autocomplete: true, // enables autocomplete
//   topK: 5,
// });

// console.log(results);
