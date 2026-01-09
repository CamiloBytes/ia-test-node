import { PrismaClient, Role } from '@prisma/client';
import { ChatMessage } from '../../types/index.js';


const prisma = new PrismaClient();

export const memoryService = {
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
            console.error("Error adding message to memory:", error);
            throw error;
        }
    },

    async getMessages(sessionId: string, limit: number = 30): Promise<ChatMessage[]> {
        try {
            const memories = await prisma.memory.findMany({
                where: {
                    sessionId,
                },
                orderBy: {
                    createdAt: 'desc', // Get latest first to limit
                },
                take: limit,
            });

            // Reverse to return in chronological order
            return memories.reverse().map((m) => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content,
            }));
        } catch (error) {
            console.error("Error retrieving messages from memory:", error);
            return [];
        }
    }
};
