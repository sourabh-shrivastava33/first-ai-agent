import "dotenv/config";
import { OpenAI } from "openai";
import axios from "axios";

const client = new OpenAI();

const getWeatherDetails = async (cityName = "") => {
  const { data } = await axios.get(
    `https://wttr.in/${cityName.toLowerCase()}?format=j1`,
    {
      responseType: "text",
    }
  );

  return `The current weather of ${cityName} is ${data}`;
};

// console.log(await getWeatherDetails("bilaspur"));
let TOOL_MAP = {
  getWeatherDetails: getWeatherDetails,
};
async function main() {
  // These api calls are stateless (Chain Of Thought)
  const SYSTEM_PROMPT = `
    You are an AI assistant who works on START, THINK, TOOL_CALL and OUTPUT format.
    For a given user query first think and breakdown the problem into sub problems.
    You should always keep thinking and thinking before giving the actual output.
    Also, before  the final result to user you must check once if everything is correct.
    Also add some creativity in the final output to make it more interactive and should provide an important suggestion to user.

    Rules:
    - Strictly follow the output JSON format
    - Always follow the output in sequence that is START, THINK, TOOL_CALL and OUTPUT.
    - Always perform only one step at a time and wait for other step.
    - Alway make sure to do multiple steps of thinking before giving out output.

    Tools available:
    1. getWeatherDetails(cityName:string): Use this tool to get current weather of a city. Input to this tool is city name only.

    Output JSON Format:
    { "step": "START | THINK  | OUTPUT | TOOL_CALL", "content": "string","input":"string","tool":"string" }

    Example:
    User: What is the weather of London?
    ASSISTANT: { "step": "START", "content": "The user wants me find and return the current temprature of London" } 
    ASSISTANT: { "step": "THINK", "content": "Let me search if there is any tool available to get the current data on the basis of country name" } 
    ASSISTANT: { "step": "THINK", "content": "I found the tool called getWeatherDetails to get the current weather" } 
    ASSISTANT: { "step": "TOOL_CALL", "content": "Calling tool getWeatherDetails", "input":"London", "tool":"getWeatherDetails" }
    DEVELOPER: { "step": "OBSERVE", "content": "The current weather of London is 21°C" } 
    ASSISTANT: { "step": "OUTPUT", "content": "The current temprature of London is 21°C ,Good to have some outside tour" }
  `;

  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: "What is the weather of New York,Delhi and Mumbai?",
    },
  ];

  while (true) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
    });

    const rawContent = response.choices[0].message.content;
    const parsedContent = JSON.parse(rawContent);

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

    if (parsedContent.step === "TOOL_CALL") {
      const toolToCall = TOOL_MAP[parsedContent.tool];
      if (!toolToCall) {
        messages.push({
          role: "developer",
          content: JSON.stringify({
            step: "OBSERVE",
            content: `Tool ${parsedContent.tool} not found`,
          }),
        });
      }
      const toolResp = await toolToCall(parsedContent.input);
      messages.push({
        role: "developer",
        content: JSON.stringify({
          step: "OBSERVE",
          content: toolResp,
        }),
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
