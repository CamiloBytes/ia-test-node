# IA Test Node API

A robust Node.js API for AI chat interactions, featuring robust memory persistence and dynamic context injection. This backend supports multiple AI providers (Nvidia, Cerebras, Qwen) via a round-robin strategy.

## Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (or npm/yarn)
- **PostgreSQL** database (for memory storage)

## Setup

1. **Install dependencies:**
    ```bash
    pnpm install
    ```

2. **Environment Configuration:**
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
    CEREBRAS_API_KEY="your_key"
    GROQ_API_KEY="your_key"
    OPENROUTER_API_KEY="your_key"
    PORT=3000
    ```

3. **Database Setup:**
    Initialize the Prisma schema:
    ```bash
    pnpm exec prisma db push
    ```

4. **Run Server:**
    ```bash
    pnpm dev
    ```
    The server will start on `http://localhost:3000`.

## Docker Support

You can also run this application using Docker.

1.  **Build the image:**
    ```bash
    docker build -t ia-test-node .
    ```

2.  **Run the container:**
    Make sure you have your `.env` file configured.
    ```bash
    docker run -p 3000:3000 --env-file .env ia-test-node
    ```

## API Documentation

### `POST /chat`

Sends a message to the AI and receives a streamed response.

**Headers:**
- `Content-Type: application/json`

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Array` | Yes | Array of message objects (history). |
| `systemInstruction` | `String` | No | Defines the AI's persona or role (e.g., "You are a doctor"). |
| `context` | `String` | No | Injects specific data or knowledge (e.g., "Product X costs $10"). |

**Message Object:**
```json
{
  "role": "user", // "user" | "assistant" | "system"
  "content": "Hello!"
}
```

**Example Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Does this product have a warranty?" }
  ],
  "systemInstruction": "You are a helpful customer support agent for TechStore.",
  "context": "All laptops come with a 2-year warranty. Phones have a 1-year warranty."
}
```

**Response:**
Server-Sent Events (SSE). The server streams the text delta chunks.

## Frontend Integration Guide

This API uses **Server-Sent Events (SSE)** to stream the AI's response in real-time. This means you don't wait for the full response; you receive it character by character.

### 1. The Request Structure

You need to send a POST request with three main properties:

- **`messages`**: The history of the chat. The API uses this to maintain conversation context.
- **`systemInstruction`**: *Optional*. A hidden instruction that tells the AI how to behave.
    - *Example (E-commerce):* "You are a sales assistant for Nike. Only recommend running shoes."
    - *Example (Support):* "You are a technical support agent. Be concise and professional."
- **`context`**: *Optional*. Hidden background data the AI needs to answer questions.
    - *Example:* "Product A is $50. Product B is out of stock."

### 2. Handling the Stream (React Example)

We recommend creating a custom hook to handle the streaming logic.

#### `useChatStream.js` (Custom Hook)

```javascript
import { useState, useCallback } from 'react';

export function useChatStream() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async ({ userMessage, systemInstruction, context }) => {
    setIsLoading(true);
    
    // 1. Add user message to UI immediately
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // 2. Call API
      const response = await fetch('http://localhost:3000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userMessage }], // Send history
          systemInstruction, 
          context
        }),
      });

      if (!response.ok) throw new Error('Network error');

      // 3. Prepare to read stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      
      // Add empty assistant message to UI to start filling
      setMessages(prev => [...prev, { role: 'assistant', content: "" }]);

      // 4. Read Loop
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        
        // Filter out any SSE event tags if necessary (req is mostly raw text)
        // Note: If you see "event: error", handle it here.
        if (chunk.includes("event: error")) {
             console.error("Stream Error:", chunk);
             break;
        }

        assistantMessage += chunk;

        // Update the last message (Assistant) with new chunk
        setMessages(prev => {
          const newHistory = [...prev];
          const lastMsg = newHistory[newHistory.length - 1];
          if (lastMsg.role === 'assistant') {
            lastMsg.content = assistantMessage;
          }
          return newHistory;
        });
      }

    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  return { messages, sendMessage, isLoading };
}
```

#### Usage in Component

```jsx
import React, { useState } from 'react';
import { useChatStream } from './useChatStream';

export default function ChatWidget() {
  const { messages, sendMessage, isLoading } = useChatStream();
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    
    sendMessage({
        userMessage: input,
        // DYNAMIC PART: This is where you configure the AI for your specific app page
        systemInstruction: "You are a helper for an online bookstore.", 
        context: "The user is viewing 'Harry Potter'. Price: $15. Stock: 5."
    });
    
    setInput("");
  };

  return (
    <div>
      <div className="chat-box">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <strong>{m.role}:</strong> {m.content}
          </div>
        ))}
      </div>
      
      <input 
        value={input} 
        onChange={e => setInput(e.target.value)} 
        disabled={isLoading}
      />
      <button onClick={handleSend} disabled={isLoading}>Send</button>
    </div>
  );
}
```

## Features Explained

- **Memory**: The backend saves every message to a Database (PostgreSQL). If you refresh code, the history logic in `chat.service.ts` pulls the last 30 messages automatically.
- **Dynamic Adaptability**: You don't need to change the backend code to change the AI's "job". Just change the `systemInstruction` in your frontend request.
