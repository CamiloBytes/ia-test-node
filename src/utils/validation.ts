import { CONFIG } from '../config/constants.js';
import { ValidationError, SessionError } from './errors.js';
import { ChatMessage } from '../types/index.js';

/**
 * Valida que el session_id tenga un formato válido
 * @param sessionId - ID de sesión a validar
 * @throws SessionError si el session_id no es válido
 */
export function validateSessionId(sessionId: unknown): asserts sessionId is string {
    if (!sessionId || typeof sessionId !== 'string') {
        throw new SessionError('session_id must be a non-empty string');
    }

    if (sessionId.length < CONFIG.MIN_SESSION_ID_LENGTH) {
        throw new SessionError(
            `session_id must be at least ${CONFIG.MIN_SESSION_ID_LENGTH} characters`
        );
    }

    if (sessionId.length > CONFIG.MAX_SESSION_ID_LENGTH) {
        throw new SessionError(
            `session_id must not exceed ${CONFIG.MAX_SESSION_ID_LENGTH} characters`
        );
    }

    // Validar caracteres permitidos (alfanuméricos, guiones, guiones bajos)
    if (!/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
        throw new SessionError(
            'session_id can only contain alphanumeric characters, hyphens, and underscores'
        );
    }
}

/**
 * Valida un array de mensajes de chat
 * @param messages - Mensajes a validar
 * @throws ValidationError si los mensajes no son válidos
 */
export function validateMessages(messages: unknown): asserts messages is ChatMessage[] {
    if (!Array.isArray(messages)) {
        throw new ValidationError('messages must be an array');
    }

    if (messages.length === 0) {
        throw new ValidationError('messages array cannot be empty');
    }

    if (messages.length > CONFIG.MAX_MESSAGES_PER_REQUEST) {
        throw new ValidationError(
            `Cannot send more than ${CONFIG.MAX_MESSAGES_PER_REQUEST} messages at once`
        );
    }

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];

        if (!msg || typeof msg !== 'object') {
            throw new ValidationError(`Message at index ${i} must be an object`);
        }

        if (!('role' in msg) || !('content' in msg)) {
            throw new ValidationError(`Message at index ${i} must have 'role' and 'content' fields`);
        }

        if (!['user', 'assistant', 'system'].includes(msg.role)) {
            throw new ValidationError(
                `Message at index ${i} has invalid role: ${msg.role}`
            );
        }

        if (typeof msg.content !== 'string') {
            throw new ValidationError(`Message at index ${i} content must be a string`);
        }

        if (msg.content.length > CONFIG.MAX_MESSAGE_CONTENT_LENGTH) {
            throw new ValidationError(
                `Message at index ${i} content exceeds maximum length of ${CONFIG.MAX_MESSAGE_CONTENT_LENGTH} characters`
            );
        }
    }
}

/**
 * Sanitiza una cadena de texto removiendo caracteres peligrosos
 * @param text - Texto a sanitizar
 * @returns Texto sanitizado
 */
export function sanitizeText(text: string): string {
    // Remover caracteres de control excepto newline y tab
    return text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
}
