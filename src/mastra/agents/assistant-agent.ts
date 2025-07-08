import { Agent } from "@mastra/core/agent";
import { ollama } from "ollama-ai-provider";

export const assistant = new Agent({
  name: "assistant",
  instructions: "You are a helpful assistant.",
  model: ollama("gemma3:latest"),
});
