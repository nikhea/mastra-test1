import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLStore } from "@mastra/libsql";
import { weatherWorkflow } from "./workflows/weather-workflow";
import { weatherAgent } from "./agents/weather-agent";
// import { generalMcpAgent } from "./agents/general-mcp-agent";
import { assistant } from "./agents/assistant-agent";
import { blogWriterWorkflow } from "./workflows/blog-workflow";
import { translatorWorkflow } from "./workflows/translator-workflow";
import {
  germanTranslationAgent,
  spanishTranslationAgent,
  polishTranslationAgent,
  yourbaTranslationAgent,
} from "./agents/translations-agent";
import { comicAgent } from "./agents/comic-agent";
import { finTechBranchWorkflow } from "./workflows/finitech-branch-workflow";
import { finTechWorkflowParallel } from "./workflows/finitech-paralle-workflow";

import { qdrant, rag } from "./rag/create.rag";
import { ragAgent } from "./agents/rag-agent";
import { MastralAgent } from "./agents/doc-agent";

rag();
export const mastra = new Mastra({
  workflows: {
    weatherWorkflow,
    blogWriterWorkflow,
    translatorWorkflow,
    finTechBranchWorkflow,
    finTechWorkflowParallel,
  },
  agents: {
    weatherAgent,
    // generalMcpAgent,
    assistant,
    germanTranslationAgent,
    spanishTranslationAgent,
    polishTranslationAgent,
    yourbaTranslationAgent,
    comicAgent,
    ragAgent,
    MastralAgent,
  },
  vectors: { qdrant },
  storage: new LibSQLStore({
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
});
