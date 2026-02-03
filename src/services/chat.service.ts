import { ChatMessage } from '../types/index.js';
import { memoryService } from './memory/index.js';
import { aiServiceManager } from './ai/index.js';
import { AIServiceError } from '../utils/errors.js';
import { CONFIG } from '../config/constants.js';

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
        // 1. Guardar mensajes nuevos en memoria (best-effort)
        try {
            for (const message of messages) {
                await memoryService.addMessage(sessionId, message);
            }
        } catch (err) {
            console.warn(`[Chat Service] Memory write failed for session ${sessionId}. Continuing without persistence.`, err);
        }

        // 2. Recuperar historial de la sesión (best-effort)
        let history: ChatMessage[] = [];
        try {
            history = await memoryService.getMessages(sessionId);
        } catch (err) {
            console.warn(`[Chat Service] Memory read failed for session ${sessionId}. Continuing without history.`, err);
            history = [];
        }

        // Si no hay historial disponible, usar al menos los mensajes del request
        if (history.length === 0) {
            history = [...messages];
        }

        // 3. Contexto de aplicación (hook) + overrides opcionales del request
        const appSystemInstruction = CONFIG.APP_SYSTEM_INSTRUCTION;
        const appContext = CONFIG.APP_CONTEXT;

        const finalSystemInstruction = [appSystemInstruction, systemInstruction].filter(Boolean).join('\n\n');
        const finalContext = [appContext, context].filter(Boolean).join('\n\n');

        if (finalSystemInstruction || finalContext) {
            const systemContent = [finalSystemInstruction, finalContext]
                .filter(Boolean)
                .join('\n\nContext:\n');

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
                // Guardar respuesta completa del asistente (best-effort)
                if (fullResponse) {
                    try {
                        await memoryService.addMessage(sessionId, {
                            role: 'assistant',
                            content: fullResponse,
                        });
                    } catch (err) {
                        console.warn(`[Chat Service] Memory write (assistant) failed for session ${sessionId}.`, err);
                    }
                }
            }
        }

        return wrappedStream();
    },
};
