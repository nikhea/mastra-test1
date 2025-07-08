// import { Agent } from "@mastra/core";
// import { vectorQueryTool } from "../tools/rag-tool";
// import { groq } from "@ai-sdk/groq";
// import { Memory } from "@mastra/memory";
// import { LibSQLStore } from "@mastra/libsql";
// import { QDRANT_PROMPT } from "@mastra/rag";
// import { google } from "@ai-sdk/google";

// const llm = google("gemini-2.0-flash");
// // const llm = groq("llama-3.3-70b-versatile");

// // groq("llama-3.3-70b-versatile");

// export const ragAgent = new Agent({
//   name: "RAG Agent",
//   model: llm,
//   instructions: `
//     You are a helpful AI assistant with access to a knowledge base through vector search.

//     When a user asks a question:
//     1. Use the vector search tool to find relevant information from the knowledge base
//     2. Analyze the retrieved content carefully
//     3. Provide a comprehensive answer based on the retrieved information
//     4. If no relevant information is found, let the user know
//     5. Always cite or reference the sources when providing information

//     Guidelines:
//     - Be concise but thorough in your responses
//     - Use the retrieved context to provide accurate, specific answers
//     - If the information is unclear or incomplete, say so
//     - Format your responses in a clear, readable manner
//     - When appropriate, suggest follow-up questions or related topics
//   `,

//   //   instructions: `
//   //   Process queries using the provided context. Structure responses to be concise and relevant.
//   //   ${QDRANT_PROMPT}
//   //   `,

//   tools: {
//     vectorQuery: vectorQueryTool,
//   },
//   memory: new Memory({
//     storage: new LibSQLStore({
//       url: "file:../mastra.db",
//     }),
//   }),
// });
