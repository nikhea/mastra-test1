import * as dotenv from "dotenv";
import { mastra } from "./mastra/index";

dotenv.config();

const run = mastra.getWorkflow("blogWriterWorkflow").createRun();

const result = await run.start({
  inputData: {
    input: "London",
  },
});

console.log(JSON.stringify(result, null, 2));
