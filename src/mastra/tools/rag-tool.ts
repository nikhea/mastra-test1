// import { createVectorQueryTool } from "@mastra/rag";
// import { embedModel, indexName } from "../rag/create.rag";
// import { groq } from "@ai-sdk/groq";

// const llm = groq("llama-3.3-70b-versatile");

// export const vectorQueryTool = createVectorQueryTool({
//   vectorStoreName: "qdrant",
//   indexName: indexName,
//   model: embedModel,
//   reranker: {
//     model: llm,
//     options: {
//       weights: {
//         semantic: 0.5,
//         vector: 0.3,
//         position: 0.2,
//       },
//       topK: 100,
//     },
//   },
// });
