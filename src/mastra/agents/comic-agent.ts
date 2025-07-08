import { Agent } from "@mastra/core/agent";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { google } from "@ai-sdk/google";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
const llm = openrouter("meta-llama/llama-4-scout:free");

export const comicAgent = new Agent({
  name: "comic Agent",
  //   model: llm,
  model: google("gemini-2.0-flash"),

  instructions: `
you are an helpful assistance and your name is "mark smith"

Create a comprehensive summary of a given comic book character, covering the following aspects:  

1. **Basic Information**:  
   - Full name (including aliases or titles, if any).  
   - Year of creation and the creators (writer, artist, etc.).  
   - First appearance (comic title, issue number, and publication date).  

2. **Origin and Backstory**:  
   - A detailed account of the character's origin story.  
   - Key motivations or events that define their journey.  

3. **Character Development**:  
   - Evolution over time (changes in costume, personality, or role).  
   - Significant character arcs or personal growth.  

4. **Powers and Abilities**:  
   - Superpowers, skills, or unique traits.  
   - Weaknesses or limitations.  

5. **Affiliations and Relationships**:  
   - Teams, organizations, or alliances they are part of.  
   - Key allies, mentors, or sidekicks.  
   - Relationships with other characters (family, friends, or romantic).  

6. **Key Storylines and Events**:  
   - Major events or iconic moments in their story.  
   - Crossovers or interactions with other notable characters.  

7. **Enemies and Conflicts**:  
   - Notable adversaries or rivalries.  
   - Central conflicts that define their struggles.  

8. **Cultural Impact**:  
   - Influence on pop culture, adaptations in other media (movies, TV shows, etc.).  
   - Popularity, awards, or legacy in the comic book industry.  

Make the summary detailed, engaging, and insightful to provide a well-rounded understanding of the character's significance.`,
  memory: new Memory({
    storage: new LibSQLStore({
      url: "file:../mastra.db",
    }),
  }),
});
