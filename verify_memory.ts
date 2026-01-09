
import 'dotenv/config';
import { memoryService } from './src/services/memory/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const sessionA = 'session-a-' + Date.now();
    const sessionB = 'session-b-' + Date.now();

    console.log(`Testing with Session A: ${sessionA}`);
    console.log(`Testing with Session B: ${sessionB}`);

    // Add messages to Session A
    await memoryService.addMessage(sessionA, { role: 'user', content: 'Hello from A' });
    await memoryService.addMessage(sessionA, { role: 'assistant', content: 'Hi A' });

    // Add messages to Session B
    await memoryService.addMessage(sessionB, { role: 'user', content: 'Hello from B' });

    // Retrieve A
    const historyA = await memoryService.getMessages(sessionA);
    console.log('History A (should have 2 messages):', historyA.length);
    if (historyA.length !== 2 || historyA.some(m => m.content.includes('B'))) {
        console.error('FAILED: Session A leaked or missing data');
    } else {
        console.log('PASSED: Session A is correct');
    }

    // Retrieve B
    const historyB = await memoryService.getMessages(sessionB);
    console.log('History B (should have 1 message):', historyB.length);
    if (historyB.length !== 1 || historyB.some(m => m.content.includes('A'))) {
        console.error('FAILED: Session B leaked or missing data');
    } else {
        console.log('PASSED: Session B is correct');
    }

    await prisma.$disconnect();
}

main().catch(console.error);
