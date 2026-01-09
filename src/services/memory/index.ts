import { PrismaClient, Role } from '@prisma/client';
import { ChatMessage } from '../../types/index.js';
import { CONFIG } from '../../config/constants.js';

const prisma = new PrismaClient();

/**
 * Servicio de gestión de memoria conversacional
 * Almacena y recupera mensajes aislados por sesión
 */
export const memoryService = {
    /**
     * Agrega un mensaje a la memoria de una sesión específica
     * @param sessionId - ID único de la sesión
     * @param message - Mensaje a almacenar
     * @returns Mensaje almacenado con metadata de DB
     */
    async addMessage(sessionId: string, message: ChatMessage) {
        try {
            return await prisma.memory.create({
                data: {
                    sessionId,
                    role: message.role as Role,
                    content: message.content,
                },
            });
        } catch (error) {
            console.error(`[Memory Service] Error adding message for session ${sessionId}:`, error);
            throw error;
        }
    },

    /**
     * Recupera los últimos mensajes de una sesión
     * @param sessionId - ID único de la sesión
     * @param limit - Número máximo de mensajes a recuperar (por defecto 30)
     * @returns Array de mensajes en orden cronológico
     */
    async getMessages(sessionId: string, limit: number = CONFIG.MEMORY_MESSAGE_LIMIT): Promise<ChatMessage[]> {
        try {
            const memories = await prisma.memory.findMany({
                where: {
                    sessionId,
                },
                orderBy: {
                    createdAt: 'desc',
                },
                take: limit,
            });

            // Invertir para retornar en orden cronológico (más antiguo primero)
            return memories.reverse().map((m) => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content,
            }));
        } catch (error) {
            console.error(`[Memory Service] Error retrieving messages for session ${sessionId}:`, error);
            return [];
        }
    },
};
