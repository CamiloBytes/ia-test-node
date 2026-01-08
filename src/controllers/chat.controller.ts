
import { ChatMessage } from '../types/index.js';
import { chatService } from '../services/chat.service.js';

export const chatController = {
    async handleChat(req: any, res: any) {
        let body = '';

        req.on('data', (chunk: any) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { messages, systemInstruction, context } = JSON.parse(body) as { messages: ChatMessage[], systemInstruction?: string, context?: string };

                // Set SSE headers
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                });

                const stream = await chatService.processChat(messages, systemInstruction, context);

                for await (const chunk of stream) {
                    res.write(chunk);
                }

                res.end();

            } catch (error: any) {
                console.error('Error processing request:', error);

                if (!res.headersSent) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: error.message || 'Internal Server Error' }));
                } else {
                    // If headers sent (SSE), send error event
                    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message || 'Unknown error' })}\n\n`);
                    res.end();
                }
            }
        });
    }
};
