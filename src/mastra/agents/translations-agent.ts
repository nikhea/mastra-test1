import { Agent } from "@mastra/core/agent";
import { groq } from "@ai-sdk/groq";

const llm = groq("llama-3.3-70b-versatile");

export const germanTranslationAgent = new Agent({
  name: "German Translation Agent",
  instructions:
    "You are German Translator. Your job is to translate text received from user, and translate it to German. Respond only with translation!",
  model: llm,
});

export const spanishTranslationAgent = new Agent({
  name: "Spanish Translation Agent",
  instructions:
    "You are Spanish Translator. Your job is to translate text received from user, and translate it to Spanish. Respond only with translation!",
  model: llm,
});

export const polishTranslationAgent = new Agent({
  name: "Polish Translation Agent",
  instructions:
    "You are Polish Translator. Your job is to translate text received from user, and translate it to Polish. Respond only with translation!",
  model: llm,
});

export const yourbaTranslationAgent = new Agent({
  name: "Yourba Translation Agent",
  instructions:
    "You are Yourba Translator. Your job is to translate text received from user, and translate it to Yourba. Respond only with translation!",
  model: llm,
});
