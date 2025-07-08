import { groq } from "@ai-sdk/groq";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { google } from "@ai-sdk/google";
import { MDocument } from "@mastra/rag";
import { testJson } from "./dataJson";
import { embedMany } from "ai";
import { ollama } from "ollama-ai-provider";

const mcp = new MCPClient({
  servers: {
    general: {
      url: new URL(
        "http://localhost:5678/mcp/3874593c-a38f-43b4-b823-01f9c9843631/sse"
      ),
      requestInit: {
        headers: {
          Authorization: "Bearer your-token",
        },
      },
    },
  },
});

export const generalMcpAgent = new Agent({
  name: "General Agent",
  instructions: ``,
  model: google("gemini-2.0-flash"),
  // model: groq("llama-3.3-70b-versatile"),
  tools: await mcp.getTools(),
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});

const doc = MDocument.fromJSON(JSON.stringify(testJson));

const chunks = await doc.chunk({
  maxSize: 100,
});
const { embeddings } = await embedMany({
  // model: ollama.embedding("nomic-embed-text"),
  model: google.textEmbeddingModel("text-embedding-004"),
  values: chunks.map((chunk) => chunk.text),
});

console.log(embeddings);
