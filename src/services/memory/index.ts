import { PrismaClient, Role } from '@prisma/client';
import { ChatMessage } from '../../types/index.js';


const prisma = new PrismaClient();

export const memoryService = {
    async addMessage(message: ChatMessage) {
        try {
            return await prisma.memory.create({
                data: {
                    role: message.role as Role,
                    content: message.content,
                },
            });
        } catch (error) {
            console.error("Error adding message to memory:", error);
            throw error;
        }
    },

    async getMessages(): Promise<ChatMessage[]> {
        try {
            const memories = await prisma.memory.findMany({
                orderBy: {
                    createdAt: 'asc',
                },
            });

            return memories.map((m) => ({
                role: m.role as 'user' | 'assistant' | 'system',
                content: m.content,
            }));
        } catch (error) {
            console.error("Error retrieving messages from memory:", error);
            return [];
        }
    }
};
