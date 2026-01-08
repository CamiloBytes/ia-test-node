import 'dotenv/config';
import { createServer } from 'node:http';
import { chatController } from './src/controllers/chat.controller.js';

const PORT = process.env.PORT || 3000;

const handler = async (req: any, res: any) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    if (req.method === 'POST' && url.pathname === '/chat') {
        await chatController.handleChat(req, res);
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
