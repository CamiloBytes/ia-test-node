import { AIService } from '../../types/index.js';
import { cerebrasService } from './cerebras.js';
import { nvidiaService, qwen3Service } from './openrouter.js';

/**
 * Lista de servicios de IA disponibles
 * Los servicios se usan en rotación round-robin
 */
const services: AIService[] = [nvidiaService, cerebrasService, qwen3Service];

let currentServiceIndex = 0;

/**
 * Manager para gestionar múltiples servicios de IA
 */
export const aiServiceManager = {
    /**
     * Obtiene el siguiente servicio en rotación
     * @returns Servicio de IA disponible
     */
    getNextService(): AIService {
        const service = services[currentServiceIndex];
        currentServiceIndex = (currentServiceIndex + 1) % services.length;
        return service;
    },
};
