import { ChatMessage } from '../types/index.js';
import { memoryService } from './memory/index.js';
import { aiServiceManager } from './ai/index.js';
import { AIServiceError } from '../utils/errors.js';

/**
 * Servicio principal de chat que coordina memoria y servicios de IA
 */
export const chatService = {
    /**
     * Procesa un request de chat completo: guarda mensajes, recupera historial y genera respuesta
     * @param sessionId - ID único de la sesión del usuario
     * @param messages - Mensajes nuevos del usuario
     * @param systemInstruction - Instrucción de sistema opcional
     * @param context - Contexto adicional opcional
     * @returns Stream asíncrono de la respuesta de la IA
     */
    async processChat(
        sessionId: string,
        messages: ChatMessage[],
        systemInstruction?: string,
        context?: string
    ) {
        // 1. Guardar mensajes nuevos en memoria
        for (const message of messages) {
            await memoryService.addMessage(sessionId, message);
        }

        // 2. Recuperar historial de la sesión
        const history = await memoryService.getMessages(sessionId);

        // 3. Agregar mensaje de sistema/contexto si se provee
        if (systemInstruction || context) {
            const systemContent = [systemInstruction, context].filter(Boolean).join('\n\nContext:\n');
            history.unshift({
                role: 'system',
                content: systemContent,
            });
        }

        // 4. Obtener servicio de IA (rotación)
        const service = aiServiceManager.getNextService();
        console.log(`[Chat Service] Using ${service?.name} for session ${sessionId}`);

        if (!service) {
            throw new AIServiceError('No AI service available');
        }

        // 5. Llamar al servicio de IA
        const originalStream = await service.chat(history);

        // 6. Envolver stream para capturar y guardar respuesta completa
        async function* wrappedStream() {
            let fullResponse = '';
            try {
                for await (const chunk of originalStream) {
                    if (chunk) {
                        fullResponse += chunk;
                        yield chunk;
                    }
                }
            } finally {
                // Guardar respuesta completa del asistente
                if (fullResponse) {
                    await memoryService.addMessage(sessionId, {
                        role: 'assistant',
                        content: fullResponse,
                    });
                }
            }
        }

        return wrappedStream();
    },
};
