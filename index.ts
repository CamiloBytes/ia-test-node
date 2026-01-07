import 'dotenv/config';
import { createServer } from 'node:http';
import { cerebrasService } from './services/cerebras.js';
import { openRouterService } from './services/openRouter.js';
import type { AIService, ChatMessage } from './type.js';

const services: AIService[] = [
    openRouterService,
    cerebrasService,
];

let currentServiceIndex = 0;

function getNextService() {
    const service = services[currentServiceIndex];
    currentServiceIndex = (currentServiceIndex + 1) % services.length;
    return service;
}

const PORT = process.env.PORT || 3000;

const handler = async (req: any, res: any) => {
    // Enable CORS manually if needed, or just basic headers
    // For this simple example, we assume same-origin or handled by proxy/client correctly

    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (req.method === 'POST' && url.pathname === '/chat') {
        let body = '';

        req.on('data', (chunk: any) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                const { messages } = JSON.parse(body) as { messages: ChatMessage[] };
                const service = getNextService();

                console.log(`Using ${service?.name} service`);

                // Set SSE headers
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                });

                if (service) {
                    const stream = await service.chat(messages);

                    for await (const chunk of stream) {
                        res.write(chunk);
                    }
                }

                res.end();
            } catch (error) {
                console.error('Error processing request:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end("Not found");
};

const server = createServer(handler);

// Only listen if this file is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

export default handler;
