import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { MCPClient } from "@mastra/mcp";
import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

export const myMcpServer = new MCPClient({
  servers: {
    mcpServers: {
      command: "npx",
      args: ["-y", "@mastra/mcp-docs-server"],
    },
  },
});

export const MastralAgent = new Agent({
  name: "Mastral doc Agent",
  instructions: ``,
  model: google("gemini-2.0-flash"),
  // model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
  tools: await myMcpServer.getTools(),
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
