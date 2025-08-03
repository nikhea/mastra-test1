import fs from "fs";
import path from "path";
import Groq from "groq-sdk";

const groq = new Groq();

type TtsFormat = "wav" | "flac" | "mp3" | "mulaw" | "ogg";

export async function textToSpeechToFile(
  text: string,
  outputPath: string = path.resolve("./speech.mp3"),
  format: TtsFormat = "wav",
  voice: string = "Aaliyah-PlayAI",
  model: string = "playai-tts"
): Promise<void> {
  const resp = await groq.audio.speech.create({
    model,
    voice,
    input: text,
    response_format: format,
  });
  const arrayBuffer = await resp.arrayBuffer();
  const p = await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
  console.log({
    response: resp,
    outputPath,
    arrayBuffer,
    p,
  });
}

// await textToSpeechToFile("Hello!");
