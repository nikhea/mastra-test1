// import { createTool } from "@mastra/core";
// import z from "zod";
// import { comicAgent } from "../agents/comic-agent";

// export const comicSchema = z.object({
//   basicInformation: z.object({
//     fullName: z.string(),
//     aliases: z.array(z.string()),
//     yearOfCreation: z.number(),
//     creators: z.object({
//       writer: z.string(),
//       artists: z.array(z.string()),
//       nameSuggestedBy: z.string(),
//     }),
//     firstAppearance: z.object({
//       comicTitle: z.string(),
//       issueNumber: z.number(),
//       publicationDate: z.string(),
//     }),
//   }),
//   originAndBackstory: z.object({
//     originStory: z.string(),
//     keyMotivations: z.array(z.string()),
//   }),
//   characterDevelopment: z.object({
//     evolution: z.array(z.string()),
//     significantArcs: z.array(z.string()),
//   }),
//   powersAndAbilities: z.object({
//     superpowersAndSkills: z.array(z.string()),
//     weaknesses: z.array(z.string()),
//   }),
//   affiliationsAndRelationships: z.object({
//     teamsAndOrganizations: z.array(z.string()),
//     keyAllies: z.array(z.string()),
//     notableRelationships: z.array(z.string()),
//   }),
//   keyStorylinesAndEvents: z.object({
//     majorEvents: z.array(z.string()),
//     crossovers: z.array(z.string()),
//   }),
//   enemiesAndConflicts: z.object({
//     notableAdversaries: z.array(z.string()),
//     centralConflicts: z.array(z.string()),
//   }),
//   culturalImpact: z.object({
//     mediaAdaptations: z.object({
//       films: z.array(z.object({ actor: z.string(), film: z.string() })),
//       television: z.array(z.object({ actor: z.string(), series: z.string() })),
//       gamesAndAnimation: z.array(z.string()),
//     }),
//     popCultureLegacy: z.array(z.string()),
//     creatorPraise: z.string(),
//     newDevelopments: z.string().optional(),
//   }),
// });

// export const comicTool = createTool({
//   id: "get-comic",
//   description: "Get comic book charater based on name",
//   inputSchema: z.object({
//     input: z.string().describe("comic book charater"),
//   }),
//   execute: async ({ context }) => {
//     const response: any = await comicAgent.generate(
//       [
//         {
//           role: "user",
//           content: context.input,
//         },
//       ],
//       {
//         experimental_output: comicSchema,
//       }
//     );

//     console.log("Structured Output:", response.object);

//     return response.object;
//   },
// });
