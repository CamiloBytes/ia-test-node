# 📋 Prompt para crear interfaz React

Usa este prompt para generar una interfaz de chat en React que consuma esta API.

---

## Prompt

```
Crea una interfaz de chat en React moderna y responsiva para consumir la siguiente API de chat con IA.

## ARQUITECTURA DEL BACKEND

### Endpoint Principal
- **URL**: `POST http://localhost:3000/chat`
- **Respuesta**: Server-Sent Events (SSE) - streaming en tiempo real

### Request Body (JSON)
```json
{
  "messages": [
    { "role": "user", "content": "Hola, ¿cómo estás?" },
    { "role": "assistant", "content": "¡Hola! Estoy bien, gracias." },
    { "role": "user", "content": "Nueva pregunta aquí" }
  ],
  "systemInstruction": "Eres un asistente amigable de una tienda online.",
  "context": "Producto actual: Laptop HP $999. Stock: 5 unidades."
}
```

### Campos del Request
| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `messages` | `Array<ChatMessage>` | Sí | Historial de mensajes (máximo 50 por request) |
| `systemInstruction` | `string` | No | Define la personalidad/rol del AI |
| `context` | `string` | No | Datos específicos que el AI debe conocer |

### ChatMessage Interface
```typescript
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string; // máximo 50,000 caracteres
}
```

### Respuesta
- El servidor responde con **SSE (Server-Sent Events)**
- Los chunks de texto llegan en tiempo real
- Si hay error durante el stream: `event: error\ndata: {"error": "mensaje"}`

### Headers opcionales
- `X-Session-Id`: ID de sesión (8-128 caracteres) para persistencia de memoria

## CARACTERÍSTICAS DEL BACKEND
1. **Memoria persistente**: El backend guarda automáticamente el historial en PostgreSQL
2. **Multi-proveedor IA**: Usa Cerebras, NVIDIA y Qwen3 en rotación
3. **Streaming**: Las respuestas llegan en tiempo real, carácter por carácter

## REQUISITOS DE LA INTERFAZ

### Funcionalidades
1. Chat en tiempo real con efecto de "typing" mientras llega el stream
2. Historial de mensajes con scroll automático
3. Input de texto con envío por Enter o botón
4. Indicador de carga mientras el AI responde
5. Manejo de errores con mensajes amigables
6. Diseño responsivo (mobile-first)

### Componentes sugeridos
1. `ChatContainer` - Contenedor principal
2. `MessageList` - Lista de mensajes con scroll
3. `Message` - Burbuja de mensaje individual (diferente estilo user/assistant)
4. `ChatInput` - Input + botón de envío
5. `useChatStream` - Custom hook para manejar el streaming

### Lógica del Hook useChatStream
```javascript
// El hook debe:
// 1. Mantener el array de mensajes en estado
// 2. Agregar mensaje del usuario inmediatamente al UI
// 3. Hacer fetch con streaming al endpoint
// 4. Leer el stream chunk por chunk
// 5. Actualizar el mensaje del assistant en tiempo real
// 6. Manejar estados de loading y error
```

### Código de referencia para leer el stream
```javascript
const response = await fetch('http://localhost:3000/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ messages, systemInstruction, context })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value, { stream: true });
  // Detectar errores SSE
  if (chunk.includes("event: error")) {
    // Manejar error
    break;
  }
  // Agregar chunk al mensaje del assistant
}
```

### Estilos
- Usar Tailwind CSS o styled-components
- Tema claro/oscuro opcional
- Burbujas de chat con colores diferenciados:
  - Usuario: Azul/derecha
  - Asistente: Gris/izquierda
- Efecto de aparición suave para mensajes nuevos
- Avatar o icono para cada rol

### Props configurables del componente principal
```typescript
interface ChatWidgetProps {
  apiUrl?: string; // default: 'http://localhost:3000/chat'
  systemInstruction?: string; // Personalidad del AI
  context?: string; // Contexto de la página/producto
  placeholder?: string; // Placeholder del input
  title?: string; // Título del chat
}
```

Genera el código completo con TypeScript, incluyendo todos los componentes, el custom hook, y estilos con Tailwind CSS.
```

---

## Ejemplo de implementación del Custom Hook

```typescript
// hooks/useChatStream.ts
import { useState, useCallback } from 'react';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UseChatStreamOptions {
  apiUrl?: string;
  systemInstruction?: string;
  context?: string;
}

export function useChatStream(options: UseChatStreamOptions = {}) {
  const {
    apiUrl = 'http://localhost:3000/chat',
    systemInstruction,
    context
  } = options;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (userMessage: string) => {
    if (!userMessage.trim()) return;
    
    setIsLoading(true);
    setError(null);

    // 1. Agregar mensaje del usuario inmediatamente
    const newUserMessage: ChatMessage = { role: 'user', content: userMessage };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);

    try {
      // 2. Hacer request al API
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          systemInstruction,
          context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error de red');
      }

      // 3. Preparar para leer el stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No se pudo leer la respuesta');

      const decoder = new TextDecoder();
      let assistantMessage = '';

      // 4. Agregar mensaje vacío del asistente
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      // 5. Leer chunks del stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Detectar errores SSE
        if (chunk.includes('event: error')) {
          const errorMatch = chunk.match(/data: (.+)/);
          if (errorMatch) {
            const errorData = JSON.parse(errorMatch[1]);
            throw new Error(errorData.error);
          }
          break;
        }

        assistantMessage += chunk;

        // 6. Actualizar el último mensaje (assistant) en tiempo real
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'assistant') {
            lastMessage.content = assistantMessage;
          }
          return newMessages;
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [messages, apiUrl, systemInstruction, context]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    clearMessages
  };
}
```

---

## Ejemplo de Componente de Chat

```tsx
// components/ChatWidget.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useChatStream } from '../hooks/useChatStream';

interface ChatWidgetProps {
  apiUrl?: string;
  systemInstruction?: string;
  context?: string;
  placeholder?: string;
  title?: string;
}

export function ChatWidget({
  apiUrl,
  systemInstruction,
  context,
  placeholder = 'Escribe tu mensaje...',
  title = 'Chat AI'
}: ChatWidgetProps) {
  const { messages, sendMessage, isLoading, error } = useChatStream({
    apiUrl,
    systemInstruction,
    context
  });
  
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-[600px] max-w-2xl mx-auto border rounded-lg shadow-lg bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-blue-600 text-white rounded-t-lg">
        <h2 className="font-semibold">{title}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-md'
                  : 'bg-gray-200 text-gray-800 rounded-bl-md'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        
        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="bg-gray-200 px-4 py-2 rounded-2xl rounded-bl-md">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 text-center text-sm">
            Error: {error}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## Uso del Componente

```tsx
// App.tsx o cualquier página
import { ChatWidget } from './components/ChatWidget';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <ChatWidget
        apiUrl="http://localhost:3000/chat"
        systemInstruction="Eres un asistente amigable para una tienda de tecnología."
        context="Productos disponibles: iPhone 15 ($999), MacBook Pro ($1999), iPad ($599)"
        title="Asistente de Ventas"
        placeholder="¿En qué puedo ayudarte?"
      />
    </div>
  );
}

export default App;
```
