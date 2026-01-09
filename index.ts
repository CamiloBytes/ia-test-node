import 'dotenv/config';
import { createServer } from 'node:http';
import { chatController } from './src/controllers/chat.controller.js';
import { CONFIG, validateEnvVars } from './src/config/constants.js';

// Validar variables de entorno al inicio
validateEnvVars();

const PORT = CONFIG.PORT;

/**
 * Handler principal de requests HTTP
 */
const handler = async (req: any, res: any) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    // Ruta POST /chat
    if (req.method === 'POST' && url.pathname === '/chat') {
        await chatController.handleChat(req, res);
        return;
    }

    // Ruta GET / (página de bienvenida)
    if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('¡Bienvenido a la API de chat!');
        return;
    }

    // Todo lo demás → 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
};

const server = createServer(handler);

// Solo escuchar si este archivo se ejecuta directamente (no cuando se importa)
if (import.meta.url === `file://${process.argv[1]}`) {
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`POST /chat - Chat endpoint`);
    });
}

export default handler;
