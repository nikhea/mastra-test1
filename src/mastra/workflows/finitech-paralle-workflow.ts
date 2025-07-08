import { groq } from "@ai-sdk/groq";
import { createStep, createWorkflow } from "@mastra/core";
import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import z from "zod";

// const model = groq("llama-3.3-70b-versatile");
const model = ollama("llama3.2:latest");

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

// Updated output schema to handle multiple agent responses
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

// Enhanced preprocessing step to identify multiple relevant agents
const preprocessStep = createStep({
  id: "finTech-preprocess",
  inputSchema: inputText,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      const { object } = await generateObject({
        model,
        system: `You are the initial customer support contact point.
                 Your job is to analyze customer issues and identify ALL potentially relevant departments.
                 
                 Agent Types:
                 - technical: Issues with internet, connectivity, technical problems, system errors
                 - account: Account management, subscription changes, cancellations, profile updates
                 - finance: Billing issues, payment problems, refunds, pricing questions
                 - search: Information requests, data queries, user listings
                 - unknown: Unclear or ambiguous requests
                 
                 For complex requests that span multiple areas, identify ALL relevant agent types.
                 For example: "Cancel my subscription due to poor internet" would involve both "account" and "technical".
                 
                 Set the primary agent_type as the most important one, but list all relevant agents in relevant_agents array.
                 Rate your confidence level between 1 to 10 for the primary agent assignment.`,
        schema: z.object({
          agent_type: z.enum(agentTypes),
          confidence: z.number().min(1).max(10),
          customer_sentiment: z.enum([
            "positive",
            "neutral",
            "negative",
            "urgent",
          ]),
          response: z.string().describe("Initial acknowledgment response"),
          resolution_status: z.enum(["resolved", "escalated", "pending"]),
          relevant_agents: z
            .array(z.enum(agentTypes))
            .describe("All relevant agent types"),
          error: z.string().optional(),
        }),
        prompt: inputData.input,
      });
      console.log({
        agent_type: object.agent_type,
        confidence: object.confidence,
        customer_sentiment: object.customer_sentiment,
        input: inputData.input,
        response: object.response,
        resolution_status: object.resolution_status,
        relevant_agents: object.relevant_agents,
        error: object.error,
      });
      return {
        agent_type: object.agent_type,
        confidence: object.confidence,
        customer_sentiment: object.customer_sentiment,
        input: inputData.input,
        response: object.response,
        resolution_status: object.resolution_status,
        relevant_agents: object.relevant_agents,
        error: object.error,
      };
    } catch (error) {
      return {
        error: `Failed to process input: ${error}`,
        agent_type: "unknown" as const,
        confidence: 0,
        customer_sentiment: "neutral" as const,
        input: inputData.input,
        response:
          "I apologize, but I'm having trouble processing your request. Let me connect you with a support agent.",
        resolution_status: "escalated" as const,
        relevant_agents: ["unknown" as const],
      };
    }
  },
});

// Technical support step
const technicalStep = createStep({
  id: "finTech-technical",
  inputSchema: outputSchema,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      const { object } = await generateObject({
        model,
        system: `You are a technical support specialist. 
                 Help customers with technical issues including internet connectivity, system errors, and technical troubleshooting.
                 Provide clear, step-by-step solutions and determine if the issue is resolved or needs escalation.
                 Focus specifically on the technical aspects of their request.`,
        schema: z.object({
          response: z.string(),
          resolution_status: z.enum(["resolved", "escalated", "pending"]),
          error: z.string().optional(),
        }),
        prompt: `Customer issue: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Provide technical support focusing on technical aspects only.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
        agent_responses: {
          ...inputData.agent_responses,
          technical: object.response,
        },
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Technical support failed: ${error}`,
        resolution_status: "escalated" as const,
        agent_responses: {
          ...inputData.agent_responses,
          technical:
            "Technical support is currently unavailable. Escalating to senior technical team.",
        },
      };
    }
  },
});

// Account management step
const accountStep = createStep({
  id: "finTech-account",
  inputSchema: outputSchema,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      const { object } = await generateObject({
        model,
        system: `You are an account management specialist.
                 Help customers with account-related issues including subscription management, cancellations, profile updates, and account settings.
                 Be empathetic and provide clear instructions for account changes.
                 Focus specifically on the account management aspects of their request.`,
        schema: z.object({
          response: z.string(),
          resolution_status: z.enum(["resolved", "escalated", "pending"]),
          error: z.string().optional(),
        }),
        prompt: `Customer issue: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Help with account management aspects only.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
        agent_responses: {
          ...inputData.agent_responses,
          account: object.response,
        },
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Account management failed: ${error}`,
        resolution_status: "escalated" as const,
        agent_responses: {
          ...inputData.agent_responses,
          account:
            "Account management is currently unavailable. Connecting you with our account team.",
        },
      };
    }
  },
});

// Finance/billing step
const financeStep = createStep({
  id: "finTech-finance",
  inputSchema: outputSchema,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      const { object } = await generateObject({
        model,
        system: `You are a finance and billing specialist.
                 Help customers with billing issues, payment problems, refunds, and pricing questions.
                 Be professional and provide clear information about financial matters.
                 Focus specifically on the billing/finance aspects of their request.`,
        schema: z.object({
          response: z.string(),
          resolution_status: z.enum(["resolved", "escalated", "pending"]),
          error: z.string().optional(),
        }),
        prompt: `Customer issue: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Help with billing/finance aspects only.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
        agent_responses: {
          ...inputData.agent_responses,
          finance: object.response,
        },
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Finance support failed: ${error}`,
        resolution_status: "escalated" as const,
        agent_responses: {
          ...inputData.agent_responses,
          finance:
            "Billing support is currently unavailable. Transferring to billing department.",
        },
      };
    }
  },
});

// Search/information step
const searchStep = createStep({
  id: "finTech-search",
  inputSchema: outputSchema,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      const { object } = await generateObject({
        model,
        system: `You are an information specialist.
                 Help customers with information requests, data queries, and search-related tasks.
                 Note: For security reasons, you cannot provide actual user lists or sensitive data.
                 Explain what information can be provided and guide customers to appropriate self-service options.`,
        schema: z.object({
          response: z.string(),
          resolution_status: z.enum(["resolved", "escalated", "pending"]),
          error: z.string().optional(),
        }),
        prompt: `Customer request: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Help with information requests while maintaining security protocols.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
        agent_responses: {
          ...inputData.agent_responses,
          search: object.response,
        },
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Search support failed: ${error}`,
        resolution_status: "escalated" as const,
        agent_responses: {
          ...inputData.agent_responses,
          search: "Information services are currently unavailable.",
        },
      };
    }
  },
});

// Unknown step
const unknownStep = createStep({
  id: "finTech-unknown",
  inputSchema: outputSchema,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      const { object } = await generateObject({
        model,
        system: `You are a general customer support representative.
                 Handle unclear or ambiguous customer requests by asking clarifying questions
                 and providing general assistance to route them to the appropriate department.`,
        schema: z.object({
          response: z.string(),
          resolution_status: z.enum(["resolved", "escalated", "pending"]),
          error: z.string().optional(),
        }),
        prompt: `Customer message: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 This request couldn't be categorized clearly. Please provide general assistance and ask clarifying questions.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status || "pending",
        error: object.error,
        agent_responses: {
          ...inputData.agent_responses,
          unknown: object.response,
        },
      };
    } catch (error) {
      return {
        ...inputData,
        error: `General support failed: ${error}`,
        resolution_status: "escalated" as const,
        agent_responses: {
          ...inputData.agent_responses,
          unknown:
            "General support is currently unavailable. Please contact our support team directly.",
        },
      };
    }
  },
});

// Consolidation step to combine all agent responses
const consolidateStep = createStep({
  id: "finTech-consolidate",
  inputSchema: outputSchema,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      // Combine all agent responses into a coherent final response
      const agentResponses = inputData.agent_responses || {};
      const responseKeys = Object.keys(agentResponses);

      if (responseKeys.length === 0) {
        return {
          ...inputData,
          response:
            "I apologize, but I wasn't able to process your request properly. Please try again or contact support directly.",
          resolution_status: "escalated" as const,
        };
      }

      const { object } = await generateObject({
        model,
        system: `You are a customer service coordinator. 
                 Your job is to take responses from multiple specialized agents and create a single, coherent, helpful response for the customer.
                 Combine the information logically and ensure the customer gets a complete answer to their request.
                 Remove any redundancy and present the information in a clear, organized manner.`,
        schema: z.object({
          response: z
            .string()
            .describe("Final consolidated response to customer"),
          resolution_status: z.enum(["resolved", "escalated", "pending"]),
        }),
        prompt: `Customer original request: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 
                 Agent responses received:
                 ${responseKeys
                   .map((key) => `${key.toUpperCase()}: ${agentResponses[key]}`)
                   .join("\n\n")}
                 
                 Please create a single, comprehensive response that addresses all aspects of the customer's request.`,
      });

      console.log({
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
      };
    } catch (error) {
      return {
        ...inputData,
        response:
          "I've gathered information from our specialist teams. Please review the individual responses above, or contact our support team for further assistance.",
        resolution_status: "pending" as const,
        error: `Consolidation failed: ${error}`,
      };
    }
  },
});

// APPROACH 1: Parallel execution - all relevant agents respond simultaneously
export const finTechWorkflowParallel = createWorkflow({
  id: "finTech-workflow-parallel",
  inputSchema: inputText,
  outputSchema: outputSchema,
  steps: [preprocessStep],
})
  .then(preprocessStep)
  .branch([])
  .then(consolidateStep)
  .commit();

// .parallel([
//   // Technical agent runs if relevant
//   [
//     async ({ inputData }) => inputData.relevant_agents.includes("technical"),
//     technicalStep,
//   ],
//   // Account agent runs if relevant
//   [
//     async ({ inputData }) => inputData.relevant_agents.includes("account"),
//     accountStep,
//   ],
//   // Finance agent runs if relevant
//   [
//     async ({ inputData }) => inputData.relevant_agents.includes("finance"),
//     financeStep,
//   ],
//   // Search agent runs if relevant
//   [
//     async ({ inputData }) => inputData.relevant_agents.includes("search"),
//     searchStep,
//   ],
//   // Unknown agent runs if relevant
//   [
//     async ({ inputData }) => inputData.relevant_agents.includes("unknown"),
//     unknownStep,
//   ],
// ])
