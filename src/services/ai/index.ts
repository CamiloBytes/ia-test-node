
import { AIService } from '../../types/index.js';
import { nvidiaService } from './nvidia.js';
import { cerebrasService } from './cerebras.js';
import { qwen3Service } from './qwen3.js';

const services: AIService[] = [
    nvidiaService,
    cerebrasService,
    qwen3Service
];

let currentServiceIndex = 0;

export const aiServiceManager = {
    getNextService(): AIService {
        const service = services[currentServiceIndex];
        currentServiceIndex = (currentServiceIndex + 1) % services.length;
        return service;
    }
};
