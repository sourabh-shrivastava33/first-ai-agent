import "dotenv/config";
import { OpenAI } from "openai";

import {
  createFile,
  createFolder,
  executeCommand,
  getGithubUserInfoByUsername,
  getWeatherDetailsByCity,
} from "./tools.js";

const TOOL_MAP = {
  getWeatherDetailsByCity: getWeatherDetailsByCity,
  getGithubUserInfoByUsername: getGithubUserInfoByUsername,
  createFolder: createFolder,
  createFile: createFile,
  executeCommand: executeCommand,
};

const client = new OpenAI();

async function main() {
  // These api calls are stateless (Chain Of Thought)
  const SYSTEM_PROMPT = `
  SYSTEM:
You are a JSON-only assistant. For every user query respond with exactly one JSON object and nothing else.
The JSON schema (all fields required unless null):
{
  "step": "START|THINK|TOOL|OBSERVE|OUTPUT",
  "content": "string",        // short textual content or plan; no chain-of-thought
  "tool_name": "string|null", // name of tool to call for TOOL step, otherwise null
  "input": "object|null"      // input to the tool for TOOL step, otherwise null
}


    Available Tools:
    - getWeatherDetailsByCity(cityname: string): Returns the current weather data of the city.
    - getGithubUserInfoByUsername(username: string): Retuns the public info about the github user using github api
    - createFolder(folderName:string): Creates a folder in current working directory
    - createFile(folderPath:string, fileName:string, htmlContent:string): Creates a file in the given folder path with the content
     - executeCommand(command: string): Takes a linux / unix command as arg and executes the command on user's machine and returns the output


    Rules:
- Output only a single JSON object and nothing else (no explanation, no logs).
- The THINK step must be a short plan or checklist (no inner monologue).
- If you want a tool run, return step = "TOOL" with tool_name and input. Wait for the tool result (the app will call the tool and then send the OBSERVE back to you).
- If the tool required single argument return input as a string and if tool required multiple argument return object with the named fields in correct sequence of parameters as required by the tool.
-Return the HTML as a string value in JSON, ensuring all backslashes and quotes are properly escaped.

    Output JSON Format:
    { "step": "START | THINK | OUTPUT | OBSERVE | TOOL" , "content": "string", "tool_name": "string", "input": "object" }

    Example:
    User: Hey, can you tell me weather of Patiala?
    ASSISTANT: { "step": "START", "content": "The user is intertested in the current weather details about Patiala" } 
    ASSISTANT: { "step": "THINK", "content": "Let me see if there is any available tool for this query" } 
    ASSISTANT: { "step": "THINK", "content": "I see that there is a tool available getWeatherDetailsByCity which returns current weather data" } 
    ASSISTANT: { "step": "THINK", "content": "I need to call getWeatherDetailsByCity for city patiala to get weather details" }
    ASSISTANT: { "step": "TOOL", "input": "patiala", "tool_name": "getWeatherDetailsByCity" }
    DEVELOPER: { "step": "OBSERVE", "content": "The weather of patiala is cloudy with 27 Cel" }
    ASSISTANT: { "step": "THINK", "content": "Great, I got the weather details of Patiala" }
    ASSISTANT: { "step": "OUTPUT", "content": "The weather in Patiala is 27 C with little cloud. Please make sure to carry an umbrella with you. ☔️" }
  `;

  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content:
        "Push this code to github with a nice commit message and also add a Readme.md file with the details by reading this index.js and tools.js for making sense of purpose of this repo.",
    },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });

    const rawContent = response.choices[0].message.content;
    let parsedContent = null;
    try {
      parsedContent = JSON.parse(rawContent);
      console.log(`✅ The assistant response is a valid JSON. Response`);
    } catch (error) {
      console.log(`❌ The assistant response is not a valid JSON. Response`);
      messages.push({
        role: "developer",
        content: `The assistant response is not a valid JSON. Response: ${rawContent}`,
      });
      continue;
    }

    messages.push({
      role: "assistant",
      content: JSON.stringify(parsedContent),
    });

    if (parsedContent.step === "START") {
      console.log(`🔥`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === "THINK") {
      console.log(`\t🧠`, parsedContent.content);
      continue;
    }

    if (parsedContent.step === "TOOL") {
      const toolToCall = parsedContent.tool_name;
      if (!TOOL_MAP[toolToCall]) {
        messages.push({
          role: "developer",
          content: `There is no such tool as ${toolToCall}`,
        });
        continue;
      }

      let responseFromTool;
      try {
        let input = parsedContent.input;

        // Parse JSON string if necessary
        if (typeof input === "string" && input.trim().startsWith("{")) {
          input = JSON.parse(input);
        }

        if (typeof input === "object" && input !== null) {
          // Spread object fields as arguments
          responseFromTool = await TOOL_MAP[toolToCall](
            ...Object.values(input)
          );
        } else {
          // Pass single string directly
          responseFromTool = await TOOL_MAP[toolToCall](input);
        }
      } catch (err) {
        responseFromTool = `❌ Error running ${toolToCall}: ${err.message}`;
      }

      console.log(
        `🛠️: ${toolToCall}(${JSON.stringify(parsedContent.input)}) =`,
        responseFromTool
      );
      messages.push({
        role: "developer",
        content: JSON.stringify({ step: "OBSERVE", content: responseFromTool }),
      });
      continue;
    }

    if (parsedContent.step === "OUTPUT") {
      console.log(`🤖`, parsedContent.content);
      break;
    }
  }

  console.log("Done...");
}

main();
