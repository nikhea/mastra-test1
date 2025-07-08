import fs from "fs/promises";
import { MDocument, rerank } from "@mastra/rag";
import { embed, embedMany } from "ai";
import { QdrantVector } from "@mastra/qdrant";
import { ollama } from "ollama-ai-provider";
import { groq } from "@ai-sdk/groq";

if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
  throw new Error("QDRANT_URL and QDRANT_API_KEY must be set");
}

if (!process.env.QDRANT_URL) {
  throw new Error("QDRANT_URL must be set");
}

const llm = groq("llama-3.3-70b-versatile");

export const qdrant = new QdrantVector({
  url: process.env.QDRANT_URL!,
  // apiKey: process.env.QDRANT_API_KEY!,
});
export const indexName = "test_collection";
export const embedModel = ollama.embedding("nomic-embed-text");

async function embeed() {
  try {
    const rawMarkDown = await fs.readFile(
      "../../src/mastra/rag/text.md",
      "utf-8"
    );
    const doc = MDocument.fromMarkdown(rawMarkDown);
    const chunks = await doc.chunk();

    const { embeddings } = await embedMany({
      model: ollama.embedding("nomic-embed-text"),
      values: chunks.map((chunk) => chunk.text),
      maxRetries: 3,
    });

    await qdrant.createIndex({
      indexName,
      dimension: embeddings[0].length,
    });

    await qdrant.upsert({
      indexName,
      vectors: embeddings,
      metadata: chunks?.map((chunk) => ({ text: chunk.text })),
    });

    const topK = 10;

    const results = await qdrant.query({
      indexName,
      queryVector: embeddings[0],
      topK,
    });

    console.log(results);
  } catch (error) {
    console.error("Error in embeed function:", error);
  }
}

async function test() {
  const query = "What are the main points in the article?";
  try {
    const { embedding } = await embed({
      value: query,
      model: ollama.embedding("nomic-embed-text"),
    });

    const initialResults = await qdrant.query({
      indexName,
      queryVector: embedding,
      topK: 10,
    });

    const rerankedResults = await rerank(initialResults, query, llm, {
      weights: {
        semantic: 0.5,
        vector: 0.3,
        position: 0.2,
      },
      topK: 100,
    });

    console.log({
      // initialResults,
      rerankedResults,
      metadata: {
        metadata: rerankedResults[0]?.result?.metadata,
      },
    });
  } catch (error) {
    console.error("Error in test function:", error);
  }
}

async function rag() {
  try {
    await embeed();
    // await test();
  } catch (error) {
    console.error("Error in rag function:", error);
  }
}

export { rag };

// import fs from "fs/promises";
// import { MDocument, rerank } from "@mastra/rag";
// import { embed, embedMany } from "ai";
// import { QdrantVector } from "@mastra/qdrant";
// import { ollama } from "ollama-ai-provider";
// import { groq } from "@ai-sdk/groq";

// if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
//   throw new Error("QDRANT_URL and QDRANT_API_KEY must be set");
// }

// if (!process.env.QDRANT_URL) {
//   throw new Error("QDRANT_URL must be set");
// }

// const llm = groq("llama-3.3-70b-versatile");

// export const qdrant = new QdrantVector({
//   url: process.env.QDRANT_URL!,
//   // apiKey: process.env.QDRANT_API_KEY!,
// });
// export const indexName = "test_collection";
// export const embedModel = ollama.embedding("nomic-embed-text");

// const rawMarkDown = await fs.readFile("../../src/mastra/rag/text.md", "utf-8");

// async function embeed() {
//   const doc = MDocument.fromMarkdown(rawMarkDown);
//   const chunks = await doc.chunk();

//   const { embeddings } = await embedMany({
//     model: ollama.embedding("nomic-embed-text"),
//     values: chunks.map((chunk) => chunk.text),
//     maxRetries: 3,
//   });

//   await qdrant.createIndex({
//     indexName,
//     dimension: embeddings[0].length,
//   });

//   await qdrant.upsert({
//     indexName,
//     vectors: embeddings,
//     metadata: chunks?.map((chunk) => ({ text: chunk.text })),
//   });

//   const topK = 10;

//   const results = await qdrant.query({
//     indexName,
//     queryVector: embeddings[0],
//     topK,
//   });

//   console.log(results);
// }

// async function test() {
//   const query = "What are the main points in the article?";
//   try {
//     const { embedding } = await embed({
//       value: query,
//       model: ollama.embedding("nomic-embed-text"),
//     });
//     const initialResults = await qdrant.query({
//       indexName,
//       queryVector: embedding,
//       topK: 10,
//     });

//     const rerankedResults = await rerank(initialResults, query, llm, {
//       weights: {
//         semantic: 0.5,
//         vector: 0.3,
//         position: 0.2,
//       },
//       topK: 100,
//     });
//     console.log({
//       // initialResults,
//       rerankedResults,
//       metadata: {
//         metadata: rerankedResults[0]?.result?.metadata,
//       },
//     });
//   } catch (error) {
//     console.log("Error reading file:");
//   }
// }

// async function rag() {
//   try {
//     await embeed();
//     // await test();
//   } catch (error) {
//     console.log("Error reading file:");
//   }
// }
// export { rag };
