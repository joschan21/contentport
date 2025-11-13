import { createOpenRouter } from "@openrouter/ai-sdk-provider";

const apiKey = process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error("OPENROUTER_API_KEY must be set for AI to work.");
}

const headers = {
  "HTTP-Referer": "https://contentport.io/",
  "X-Title": "Contentport",
};

export const openrouter = createOpenRouter({
  apiKey,
  headers,
});