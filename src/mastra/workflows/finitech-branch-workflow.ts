import { groq } from "@ai-sdk/groq";
import { createStep, createWorkflow } from "@mastra/core";
import { generateObject } from "ai";
import z from "zod";

const model = groq("llama-3.3-70b-versatile");

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
});

//  Hi! I want to cancel my subscription now! I am very unhappy and mad and internet is bad how do we fix it, get all users and list them out
const preprocessStep = createStep({
  id: "finTech-preprocess",
  inputSchema: inputText,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      const { object } = await generateObject({
        model,
        system: `You are the initial customer support contact point.
                 Your job is to correctly categorize customer issues and route them to the appropriate department.
                 
                 Agent Types:
                 - technical: Issues with internet, connectivity, technical problems, system errors
                 - account: Account management, subscription changes, cancellations, profile updates
                 - finance: Billing issues, payment problems, refunds, pricing questions
                 - search: Information requests, data queries, user listings
                 - unknown: Unclear or ambiguous requests
                 
                 Analyze the customer's message carefully to determine which department would be best equipped to handle their issue.
                 Rate your confidence level between 1 to 10 for the right agent assignment.
                 Determine customer sentiment: positive, neutral, negative, or urgent.
                 Provide a brief initial response acknowledging their request.
                 Set resolution_status to "pending" for initial processing.`,
        schema: outputSchema,
        prompt: inputData.input,
      });
      console.log("Preprocessing result:", { object });

      return {
        agent_type: object.agent_type,
        confidence: object.confidence,
        customer_sentiment: object.customer_sentiment,
        input: inputData.input,
        response: object.response,
        resolution_status: object.resolution_status,
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
                 Always provide a helpful response and set appropriate resolution_status.`,
        schema: outputSchema,
        prompt: `Customer issue: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Please provide technical support and a resolution.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Technical support failed: ${error}`,
        resolution_status: "escalated" as const,
        response:
          "I'm experiencing technical difficulties helping you right now. Let me escalate this to our senior technical team.",
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
                 Always provide a helpful response and set appropriate resolution_status.`,
        schema: outputSchema,
        prompt: `Customer issue: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Please help with account management and provide a resolution.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Account management failed: ${error}`,
        resolution_status: "escalated" as const,
        response:
          "I'm having trouble accessing your account information right now. Let me connect you with our account management team.",
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
                 Always provide a helpful response and set appropriate resolution_status.`,
        schema: outputSchema,
        prompt: `Customer issue: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Please help with billing/finance issues and provide a resolution.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Finance support failed: ${error}`,
        resolution_status: "escalated" as const,
        response:
          "I'm unable to access billing information at the moment. Let me transfer you to our billing department for immediate assistance.",
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
        schema: outputSchema,
        prompt: `Customer request: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 Please help with information requests while maintaining security protocols.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status,
        error: object.error,
      };
    } catch (error) {
      return {
        ...inputData,
        error: `Search support failed: ${error}`,
        resolution_status: "escalated" as const,
      };
    }
  },
});

// Fallback step for unknown issues
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
        schema: outputSchema,
        prompt: `Customer message: ${inputData.input}
                 Customer sentiment: ${inputData.customer_sentiment}
                 This request couldn't be categorized clearly. Please provide general assistance and ask clarifying questions.`,
      });

      return {
        ...inputData,
        response: object.response,
        resolution_status: object.resolution_status || "pending",
        error: object.error,
      };
    } catch (error) {
      return {
        ...inputData,
        error: `General support failed: ${error}`,
        resolution_status: "escalated" as const,
        response:
          "I apologize, but I'm unable to process your request at the moment. Please contact our support team directly for assistance.",
      };
    }
  },
});

const finTechBranchWorkflow = createWorkflow({
  id: "finTech-workflow",
  inputSchema: inputText,
  outputSchema: outputSchema,
  steps: [
    preprocessStep,
    // planStep, writeStep, editStep, emailStep
  ],
})
  .then(preprocessStep)
  .branch([
    [
      async ({ inputData }) => {
        return inputData.agent_type === "technical";
      },
      technicalStep,
    ],
    [
      async ({ inputData }) => {
        return inputData.agent_type === "account";
      },
      accountStep,
    ],
    [
      async ({ inputData }) => {
        return inputData.agent_type === "finance";
      },
      financeStep,
    ],
    [
      async ({ inputData }) => {
        return inputData.agent_type === "search";
      },
      searchStep,
    ],
    [
      async ({ inputData }) => {
        return inputData.agent_type === "unknown";
      },
      unknownStep,
    ],
  ])
  .commit();

finTechBranchWorkflow.commit();

export { finTechBranchWorkflow };
