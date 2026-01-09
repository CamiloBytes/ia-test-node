
import { ChatMessage } from '../types/index.js';
import { memoryService } from './memory/index.js';
import { aiServiceManager } from './ai/index.js';

export const chatService = {
    async processChat(sessionId: string, messages: ChatMessage[], systemInstruction?: string, context?: string) {
        // 1. Save new messages to memory
        for (const message of messages) {
            await memoryService.addMessage(sessionId, message);
        }

        // 2. Retrieve history (limit handled by service)
        const history = await memoryService.getMessages(sessionId);

        // 2b. Add System/Context Message if provided
        if (systemInstruction || context) {
            const systemContent = [systemInstruction, context].filter(Boolean).join("\n\nContext:\n");
            history.unshift({
                role: 'system',
                content: systemContent
            });
        }

        // 3. Get AI Service
        const service = aiServiceManager.getNextService();
        console.log(`Using ${service?.name} service`);

        if (!service) {
            throw new Error("No AI service available");
        }

        // 4. Call AI Service
        const originalStream = await service.chat(history);

        // 5. Return wrapped stream to capture and save response
        async function* wrappedStream() {
            let fullResponse = "";
            try {
                for await (const chunk of originalStream) {
                    if (chunk) {
                        fullResponse += chunk;
                        yield chunk;
                    }
                }
            } finally {
                // Save assistant response after stream completes
                if (fullResponse) {
                    await memoryService.addMessage(sessionId, {
                        role: 'assistant',
                        content: fullResponse
                    });
                }
            }
        }

        return wrappedStream();
    }
};
