import { google } from "@ai-sdk/google";
import { createStep, createWorkflow } from "@mastra/core";
import { generateObject, generateText, streamText } from "ai";
import z from "zod";
import sendMarkdownEmail from "../../services/mail.services";

const geminiModel = google("gemini-2.0-flash-thinking-exp-01-21");

const geminiModelSearch = google("gemini-2.0-flash-thinking-exp-01-21", {
  useSearchGrounding: true,
});

const inputSchema = z.object({
  input: z.string().describe("The raw user query input for blog post planning"),
  previousState: z
    .object({
      topic: z.string().optional(),
      notes: z.array(z.string()).optional(),
    })
    .optional(),
});

const outputSchema = z.object({
  topic: z.string(),
  notes: z.array(z.string()),
  plan: z.string(),
  draft: z.string(),
  output: z.string(),
  error: z.string().optional(),
});

const preprocessSchema = z.object({
  topic: z.string(),
  notes: z.array(z.string()),
  input: z.string(),
  error: z.string().optional(),
});

const planSchema = z.object({
  topic: z.string().describe("The blog post topic (passed through)"),
  notes: z
    .array(z.string())
    .describe("List of user instructions (passed through)"),
  input: z.string().describe("Original user input (passed through)"),
  plan: z.string().describe("Generated content plan in Markdown format"),
  error: z.string().optional().describe("Error message if planning failed"),
});

const writeSchema = z.object({
  topic: z.string().describe("The blog post topic (passed through)"),
  notes: z
    .array(z.string())
    .describe("List of user instructions (passed through)"),
  input: z.string().describe("Original user input (passed through)"),
  plan: z.string().describe("Generated content plan in Markdown format"),
  draft: z.string().describe("Generating writing content in Markdown format"),
  error: z.string().optional().describe("Error message if planning failed"),
});

const editSchema = z.object({
  topic: z.string().describe("The blog post topic (passed through)"),
  notes: z
    .array(z.string())
    .describe("List of user instructions (passed through)"),
  input: z.string().describe("Original user input (passed through)"),
  plan: z.string().describe("Generated content plan in Markdown format"),
  draft: z.string().describe("Generated writing content in Markdown format"),
  edit: z.string().describe("Generated edit content in Markdown format"),
  error: z.string().optional().describe("Error message if planning failed"),
});

const preprocessStep = createStep({
  id: "blogWorkFlow-preprocess",
  inputSchema,
  outputSchema: preprocessSchema,
  execute: async ({ inputData }) => {
    console.log("\n\n🔍 Extracting topic and notes...");
    const previousTopic = inputData.previousState?.topic || "N/A";
    const previousNotes = inputData.previousState?.notes?.join(", ") || "N/A";

    try {
      const { object: result } = await generateObject({
        model: geminiModel,
        schema: outputSchema.pick({ topic: true, notes: true }),
        prompt: inputData.input,
        schemaName: "Blog",
        schemaDescription: "Schema for blog post planning and generation.",
        system: `Rewrite the user query into a clear and focused blog post topic while considering past context. Notes contain user complaints or additional guidance.
             - **Previous Topic:** ${previousTopic}
             - **Previous Notes:** ${previousNotes}
             - **User Query:** ${inputData.input}

            ### **Instructions:**
            - **Derive a single, concise blog topic** from the user query.
            - **Maintain relevance** to any past topic (if applicable).
            - **Extract key concerns** from notes to refine the topic.

            Return JSON with:
            {
               "topic": "A single, well-defined blog post topic",
               "notes": ["List of additional instructions or guidance extracted from the input."]
            }`,

        maxRetries: 5,
      });

      console.log("✓ Topic generated:", result.topic);

      return {
        topic: result.topic,
        notes: result.notes,
        input: inputData.input,
      };
    } catch (error) {
      return {
        error: `Failed to process input: ${error}`,
        topic: "",
        notes: [],
        input: inputData.input,
      };
    }
  },
});

const planStep = createStep({
  id: "blogWorkFlow-plan",
  inputSchema: preprocessSchema,
  outputSchema: planSchema,
  execute: async ({ inputData }) => {
    console.log("\n\n📋 Creating content plan...");

    try {
      const { text: plan } = await generateText({
        model: geminiModelSearch,
        prompt: `You are a Content Planner. Write a content plan for "${
          inputData.topic
        }" in Markdown format.
        Objectives:
        1. Prioritize latest trends, key players, and noteworthy news.
        2. Identify target audience, considering interests and pain points.
        3. Develop a detailed content outline including introduction, key points, and call to action.
        4. Include SEO keywords and relevant sources.

        Notes: ${inputData.notes.join(", ")}

        Provide a structured output covering the mentioned sections.`,
        maxSteps: 5,
      });
      // console.log("\n\nfinished Generating planner content...", { plan });

      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan,
      };
    } catch (error) {
      console.error("❌ Failed to generate plan:", error);
      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan: "",
        error: `Failed to create plan: ${error}`,
      };
    }
  },
});

const writeStep = createStep({
  id: "blogWorkFlow-write",
  inputSchema: planSchema,
  outputSchema: writeSchema,
  execute: async ({ inputData }) => {
    console.log("\n\nGenerating writing content...");

    try {
      const { text: draft } = await generateText({
        model: geminiModel,
        prompt: `You are a Content Writer. Write a compelling blog post based on this plan:
    ${inputData.plan}

    Objectives:
    - Engaging introduction
    - Insightful body paragraphs (2-3 per section)
    - Properly named sections/subtitles
    - Summarizing conclusion
    - Format: Markdown

    Notes: ${inputData.notes.join(", ")}

    Ensure the content flows naturally, incorporates SEO keywords, and is well-structured.`,
      });
      // console.log("\n\nfinished Generating writing content...", { draft });
      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan: inputData.plan,
        draft,
      };
    } catch (error) {
      console.error("❌ Failed to generate writing:", error);
      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan: inputData.plan,
        draft: "",
        error: `Failed to write: ${error}`,
      };
    }
  },
});

const editStep = createStep({
  id: "blogWorkFlow-edit",
  inputSchema: writeSchema,
  outputSchema: editSchema,
  execute: async ({ inputData }) => {
    console.log("\n\nGenerating writing content...");

    try {
      // console.log("\n\nGenerating editor transformation...");

      const { textStream, text } = streamText({
        model: geminiModel,
        prompt: `You are an Editor. Transform this draft blog post to a final version:
      ${inputData.draft}
  
      Objectives:
      - Fix grammatical errors
      - Apply journalistic best practices
  
      Notes: ${inputData.notes.join(", ")}
  
      IMPORTANT: The final version must not contain any editor's comments.`,
      });

      let output = "";
      for await (const chunk of textStream) {
        // process.stdout.write(chunk);
        output += chunk;
      }
      const result = await text;

      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan: inputData.plan,
        draft: inputData.draft,
        edit: result,
      };
    } catch (error) {
      // console.error("❌ Failed to generate writing:", error);
      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan: inputData.plan,
        draft: inputData.draft,
        edit: "",
        error: `Failed to write: ${error}`,
      };
    }
  },
});

const emailStep = createStep({
  id: "blogWorkFlow-email",
  inputSchema: editSchema,
  outputSchema: outputSchema,
  execute: async ({ inputData }) => {
    try {
      console.log("\n\nsending Email...");

      if (inputData.edit) {
        console.log(true);
        await sendMarkdownEmail({
          to: "imonikheaugbodaga@gmail.com",
          subject: inputData.topic,
          markdown: inputData.edit,
        });
      }
      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan: inputData.plan,
        draft: inputData.draft,
        output: inputData.edit,
      };
    } catch (error) {
      console.error("❌ Failed to send Email:", error);
      return {
        topic: inputData.topic,
        notes: inputData.notes,
        input: inputData.input,
        plan: inputData.plan,
        draft: inputData.draft,
        output: inputData.edit,
        error: `Failed to write: ${error}`,
      };
    }
  },
});

const blogWriterWorkflow = createWorkflow({
  id: "blog-writer",
  inputSchema,
  outputSchema,
  steps: [preprocessStep, planStep, writeStep, editStep, emailStep],
})
  .then(preprocessStep)
  .then(planStep)
  .then(writeStep)
  .then(editStep)
  .then(emailStep)

  .commit();

blogWriterWorkflow.commit();

export { blogWriterWorkflow };
