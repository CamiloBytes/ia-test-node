/**
 * Configuración centralizada de la aplicación
 */

export const CONFIG = {
    /** Límite máximo de mensajes que se pueden enviar en un solo request */
    MAX_MESSAGES_PER_REQUEST: 50,

    /** Límite de mensajes de historia a recuperar por sesión */
    MEMORY_MESSAGE_LIMIT: 20,

    /** Longitud mínima de session_id */
    MIN_SESSION_ID_LENGTH: 8,

    /** Longitud máxima de session_id */
    MAX_SESSION_ID_LENGTH: 128,

    /** Longitud máxima de contenido de mensaje (caracteres) */
    MAX_MESSAGE_CONTENT_LENGTH: 50000,

    /** Puerto del servidor */
    PORT: process.env.PORT || 3000,

    /** Configuración de modelos AI */
    AI_MODELS: {
        CEREBRAS: 'llama-4-scout-17b-16e-instruct',
        NVIDIA: 'meta-llama/llama-3.1-8b-instruct:free',
        QWEN3: 'qwen/qwen-2.5-72b-instruct:free',
    },

    /** Configuración de generación de IA */
    AI_DEFAULTS: {
        temperature: 0.6,
        maxTokens: 4096,
        topP: 1,
    },

    /** Instrucción de sistema global de la aplicación (se inyecta automáticamente) */
    APP_SYSTEM_INSTRUCTION: process.env.APP_SYSTEM_INSTRUCTION || '',

    /** Contexto global de la aplicación (se inyecta automáticamente) */
    APP_CONTEXT: process.env.APP_CONTEXT || '',
} as const;

/**
 * Valida que todas las variables de entorno requeridas estén presentes
 * @throws Error si falta alguna variable crítica
 */
export function validateEnvVars(): void {
    const required = ['DATABASE_URL'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Advertencias para API keys opcionales
    const optionalKeys = ['CEREBRAS_API_KEY', 'OPENROUTER_API_KEY', 'QWEN3_API_KEY'];
    const missingOptional = optionalKeys.filter((key) => !process.env[key]);

    if (missingOptional.length > 0) {
        console.warn(`⚠️  Optional API keys not found: ${missingOptional.join(', ')}`);
    }
}
