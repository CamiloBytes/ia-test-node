import { OpenRouter } from '@openrouter/sdk';
import { AIService, ChatMessage } from '../../types/index.js';
import { CONFIG } from '../../config/constants.js';
import { AIServiceError } from '../../utils/errors.js';

/**
 * Configuración para crear un servicio de OpenRouter
 */
interface OpenRouterConfig {
    name: string;
    model: string;
    apiKey: string;
}

/**
 * Crea un servicio de IA usando OpenRouter
 * @param config - Configuración del servicio
 * @returns Servicio de IA listo para usar
 */
export function createOpenRouterService(config: OpenRouterConfig): AIService {
    const client = new OpenRouter({
        apiKey: config.apiKey,
    });

    return {
        name: config.name,

        async chat(messages: ChatMessage[]) {
            try {
                const chatCompletion = await client.chat.send({
                    messages,
                    model: config.model,
                    temperature: CONFIG.AI_DEFAULTS.temperature,
                    maxCompletionTokens: CONFIG.AI_DEFAULTS.maxTokens,
                    topP: CONFIG.AI_DEFAULTS.topP,
                    stream: true,
                });

                // Generador asíncrono para manejar el streaming
                return (async function* () {
                    for await (const chunk of chatCompletion) {
                        yield chunk.choices?.[0]?.delta?.content || '';
                    }
                })();
            } catch (error: any) {
                throw new AIServiceError(
                    `OpenRouter service ${config.name} failed: ${error.message}`,
                    config.name
                );
            }
        },
    };
}

// Exportar servicios pre-configurados
export const nvidiaService: AIService = createOpenRouterService({
    name: 'Nvidia NeMoTron 3',
    model: CONFIG.AI_MODELS.NVIDIA,
    apiKey: process.env.OPENROUTER_API_KEY || '',
});

export const qwen3Service: AIService = createOpenRouterService({
    name: 'Qwen3 Coder',
    model: CONFIG.AI_MODELS.QWEN3,
    apiKey: process.env.QWEN3_API_KEY || process.env.OPENROUTER_API_KEY || '',
});
