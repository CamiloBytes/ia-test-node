import { OpenRouter } from "@openrouter/sdk";
import { AIService, ChatMessage } from '../../types/index.js';


// Crear la instancia de OpenRouter con tu API Key
const openRouter = new OpenRouter({
    apiKey: process.env.QWEN3_API_KEY
});

export const qwen3Service: AIService = {
    name: "Qwen3",

    async chat(messages: ChatMessage[]) {
        const chatCompletion = await openRouter.chat.send({
            messages,
            model: "qwen/qwen3-coder:free",
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
