import { OpenRouter } from "@openrouter/sdk";
import type { AIService, ChatMessage } from "../type.js";

// Crear la instancia de OpenRouter con tu API Key
const openRouter = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY
});

export const openRouterService: AIService = {
  name: "OpenRouter",

  async chat(messages: ChatMessage[]) {
    const chatCompletion = await openRouter.chat.send({
      messages,
      model: "nvidia/nemotron-3-nano-30b-a3b:free",
      temperature: 0.6,
      maxCompletionTokens: 4096, // Cambiado a camelCase
      topP: 1, // Cambiado a camelCase
      stream: true,
    });

    // Retornamos un generador asíncrono para manejar el streaming
    return (async function* () {
      for await (const chunk of chatCompletion) {
        yield chunk.choices?.[0]?.delta?.content || "";
      }
    })();
  }
};
