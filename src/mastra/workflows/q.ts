import { createWorkflow, createStep } from "@mastra/core/workflows";
import { z } from "zod";

const agentTypes = [
  "technical",
  "account",
  "finance",
  "search",
  "unknown",
] as const;

const inputText = z.object({
  input: z.string().describe("user text input"),
});

const outputSchema = z.object({
  agent_type: z.enum(agentTypes),
  confidence: z.number().min(1).max(10),
  customer_sentiment: z.enum(["positive", "neutral", "negative", "urgent"]),
  input: z.string().describe("user text input"),
  response: z.string().describe("Agent response to customer"),
  resolution_status: z.enum(["resolved", "escalated", "pending"]),
  error: z.string().optional().describe("Error message if processing failed"),
  relevant_agents: z
    .array(z.enum(agentTypes))
    .describe("All relevant agent types for this request"),
  agent_responses: z
    .record(z.string())
    .optional()
    .describe("Responses from multiple agents"),
});

const preprocessStep = createStep({
  id: "preprocess",
  inputSchema: inputText,
  outputSchema: z.object({
    agentTypes: z.array(z.enum(agentTypes)),
  }),
  handler: async ({ input }) => {
    // preprocess logic here
    const agentTypes = [];
    // assume agentTypes is populated based on input
    return { agentTypes };
  },
});

const technicalStep = createStep({
  id: "technical",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  handler: async () => {
    // technical logic here
    return {};
  },
});

const accountStep = createStep({
  id: "account",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  handler: async () => {
    // account logic here
    return {};
  },
});

const financeStep = createStep({
  id: "finance",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  handler: async () => {
    // finance logic here
    return {};
  },
});

const searchStep = createStep({
  id: "search",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  handler: async () => {
    // search logic here
    return {};
  },
});

const unknownStep = createStep({
  id: "unknown",
  inputSchema: z.object({}),
  outputSchema: z.object({}),
  handler: async () => {
    // unknown logic here
    return {};
  },
});

export const finTechWorkflowParallel = createWorkflow({
  id: "finTech-workflow-parallel",
  inputSchema: inputText,
  outputSchema: outputSchema,
})
  .then(preprocessStep)
  .then((preprocessOutput) => {
    const agentTypes = preprocessOutput.agentTypes;
    const steps = [];
    agentTypes.forEach((agentType) => {
      switch (agentType) {
        case "technical":
          steps.push(technicalStep);
          break;
        case "account":
          steps.push(accountStep);
          break;
        case "finance":
          steps.push(financeStep);
          break;
        case "search":
          steps.push(searchStep);
          break;
        default:
          steps.push(unknownStep);
          break;
      }
    });
    return parallel(steps);
  })
  .commit();
