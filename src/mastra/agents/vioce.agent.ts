// import { groq } from "@ai-sdk/groq";
// import { Agent } from "@mastra/core/agent";
// import { GoogleVoice } from "@mastra/voice-google";

// const model = groq("meta-llama/llama-4-scout-17b-16e-instruct");

// export const googleVoice = new GoogleVoice({
//   speechModel: { apiKey: process.env.GOOGLE_API_KEY },
//   listeningModel: { apiKey: process.env.GOOGLE_API_KEY },
//   speaker: "en-US-Standard-F",
// });

// const audioStream = await googleVoice.speak("Hello, world!", {
//   languageCode: "en-US",
//   audioConfig: {
//     audioEncoding: "LINEAR16",
//   },
// });
// console.log("Audio stream generated:", { audioStream });

// // const audioStream = await voice.speak("Hello!", {
// //   speaker: 'en-US-Standard-F',
// //   languageCode: 'en-US',
// // });

// // const agent = new Agent({
// //   name: "VoiceAgent",
// //   voice,
// //   model,
// //   instructions: "You are voice-enabled…",
// // });

// // const response = await agent.generate("Hi there!");

// // const audio = await agent.voice.speak(response.text, {
// //   speaker: "en-US-Standard-F",
// // });
// // console.log("Audio response generated:", audio);
