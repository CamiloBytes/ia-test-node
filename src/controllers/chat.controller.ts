import { ChatMessage } from '../types/index.js';
import { chatService } from '../services/chat.service.js';
import { validateSessionId, validateMessages } from '../utils/validation.js';
import { ValidationError, SessionError } from '../utils/errors.js';

/**
 * Controlador de chat que maneja requests HTTP
 */
export const chatController = {
    /**
     * Maneja requests POST a /chat
     * Valida session_id, parsea mensajes y retorna stream SSE
     */
    async handleChat(req: any, res: any) {
        let body = '';

        req.on('data', (chunk: any) => {
            body += chunk.toString();
        });

        req.on('end', async () => {
            try {
                // Parsear body
                const parsed = JSON.parse(body) as {
                    messages: ChatMessage[];
                    systemInstruction?: string;
                    context?: string;
                    session_id?: string;
                };

                // Extraer session_id (header tiene prioridad)
                const sessionId = req.headers['x-session-id'] || parsed.session_id;

                // Validar session_id
                validateSessionId(sessionId);

                // Validar mensajes
                validateMessages(parsed.messages);

                // Configurar headers SSE
                res.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    Connection: 'keep-alive',
                });

                // Procesar chat
                const stream = await chatService.processChat(
                    sessionId,
                    parsed.messages,
                    parsed.systemInstruction,
                    parsed.context
                );

                // Enviar chunks
                for await (const chunk of stream) {
                    res.write(chunk);
                }

                res.end();
            } catch (error: any) {
                console.error('[Chat Controller] Error:', error);

                // Si headers ya se enviaron (SSE), enviar evento de error
                if (res.headersSent) {
                    res.write(
                        `event: error\ndata: ${JSON.stringify({ error: error.message || 'Unknown error' })}\n\n`
                    );
                    res.end();
                    return;
                }

                // Determinar código de error
                let statusCode = 500;
                if (error instanceof ValidationError || error instanceof SessionError) {
                    statusCode = 400;
                } else if (error instanceof SyntaxError) {
                    statusCode = 400;
                }

                res.writeHead(statusCode, { 'Content-Type': 'application/json' });
                res.end(
                    JSON.stringify({
                        error: error.message || 'Internal Server Error',
                        type: error.name || 'Error',
                    })
                );
            }
        });
    },
};
