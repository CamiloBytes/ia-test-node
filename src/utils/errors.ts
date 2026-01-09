/**
 * Custom error classes para manejo de errores específicos
 */

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class SessionError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SessionError';
    }
}

export class AIServiceError extends Error {
    constructor(message: string, public serviceName?: string) {
        super(message);
        this.name = 'AIServiceError';
    }
}
