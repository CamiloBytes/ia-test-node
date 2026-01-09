import Cerebras from '@cerebras/cerebras_cloud_sdk';
import { AIService, ChatMessage } from '../../types/index.js';
import { CONFIG } from '../../config/constants.js';
import { AIServiceError } from '../../utils/errors.js';

const cerebras = new Cerebras({
    apiKey: process.env.CEREBRAS_API_KEY,
});

/**
 * Servicio de IA usando Cerebras
 */
export const cerebrasService: AIService = {
    name: 'Cerebras',

    async chat(messages: ChatMessage[]) {
        try {
            const stream = await cerebras.chat.completions.create({
                messages: messages as any,
                model: CONFIG.AI_MODELS.CEREBRAS,
                stream: true,
                max_completion_tokens: 40960,
                temperature: CONFIG.AI_DEFAULTS.temperature,
                top_p: CONFIG.AI_DEFAULTS.topP,
            });

            return (async function* () {
                for await (const chunk of stream) {
                    yield (chunk as any).choices[0]?.delta?.content || '';
                }
            })();
        } catch (error: any) {
            throw new AIServiceError(
                `Cerebras service failed: ${error.message}`,
                'Cerebras'
            );
        }
    },
};