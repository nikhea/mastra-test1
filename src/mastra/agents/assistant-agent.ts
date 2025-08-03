import { Agent } from "@mastra/core/agent";
import { groq } from "@ai-sdk/groq";
import { textToSpeechToFile } from "./x";

export const assistant = new Agent({
  name: "assistant",
  instructions: "You are a helpful assistant.",
  model: groq("llama-3.3-70b-versatile"),
});

await textToSpeechToFile(
  `It seems like you started to ask a question, but it got cut off. Could you please complete your question? How far what? I'm here to help with any distance, location, or other "how far" related questions you might have.`
);
