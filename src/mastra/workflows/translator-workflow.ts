import { createWorkflow, createStep } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { ollama } from "ollama-ai-provider";

import z from "zod";
import {
  germanTranslationAgent,
  spanishTranslationAgent,
  polishTranslationAgent,
} from "../agents/translations-agent";

const inputSchema = z.object({
  original_text: z.string(),
});

const outputSchema = z.object({
  original_text: z.string(),
  german_translation: z.string(),
  spanish_translation: z.string(),
  polish_translation: z.string(),
});

const germanTranslation = createStep({
  id: "german-translation",
  inputSchema,
  outputSchema: outputSchema.pick({ german_translation: true }),
  execute: async ({ inputData }) => {
    console.log("\n\nGenerating writing content...");

    try {
      const response = await germanTranslationAgent.generate([
        { role: "user", content: inputData.original_text },
      ]);

      console.log({
        german_translation: response.text,
      });

      return {
        german_translation: response.text,
      };
    } catch (error) {
      console.error("❌ Failed to generate writing:", error);
      return {
        german_translation: "",
      };
    }
  },
});

const spanishTranslation = createStep({
  id: "spanish-translation",
  inputSchema,
  outputSchema: outputSchema.pick({ spanish_translation: true }),
  execute: async ({ inputData }) => {
    console.log("\n\nGenerating writing content...");

    try {
      const response = await spanishTranslationAgent.generate([
        { role: "user", content: inputData.original_text },
      ]);

      console.log({
        spanish_translation: response.text,
      });

      return {
        spanish_translation: response.text,
      };
    } catch (error) {
      console.error("❌ Failed to generate writing:", error);
      return {
        spanish_translation: "",
      };
    }
  },
});

const polishTranslation = createStep({
  id: "polish-translation",
  inputSchema,
  outputSchema: outputSchema.pick({ polish_translation: true }),
  execute: async ({ inputData }) => {
    console.log("\n\nGenerating writing content...");

    try {
      const response = await polishTranslationAgent.generate([
        { role: "user", content: inputData.original_text },
      ]);

      console.log({
        polish_translation: response.text,
      });
      return {
        polish_translation: response.text,
      };
    } catch (error) {
      console.error("❌ Failed to generate writing:", error);
      return {
        polish_translation: "",
      };
    }
  },
});

const translatorWorkflow = createWorkflow({
  id: "translator",
  inputSchema,
  outputSchema,
})
  .parallel([germanTranslation, spanishTranslation, polishTranslation])
  .commit();

translatorWorkflow.commit();

export { translatorWorkflow };
