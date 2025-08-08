import React, { useState, useRef, useEffect } from 'react';
import type { TextGenerationPipeline } from '@huggingface/transformers';

export type Message = {
  role: 'user' | 'assistant';
  text: string;
};

interface ChatUIProps {
  pipeline: TextGenerationPipeline;
  maxNewTokens?: number;
}

export function ChatUI({
  pipeline,
  maxNewTokens = 64,
}: ChatUIProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // auto‐scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const prompt = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: prompt }]);
    setSending(true);

    try {
      const outputs = await pipeline(prompt, { max_new_tokens: maxNewTokens });
      const first   = outputs[0];

      // Pick the right field
      let raw = 
        'generated_text' in first
          ? first.generated_text     // string
          : 'text' in first
            ? first.text            // Chat or string
            : (() => { throw new Error('Unexpected pipeline output'); })();

      // Ensure we have a string
      const reply: string =
        typeof raw === 'string'
          ? raw
          : JSON.stringify(raw);

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${err.message}` },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col border-t pt-4">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 bg-white rounded-lg">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`px-3 py-2 rounded-lg max-w-xs whitespace-pre-wrap ${
              msg.role === 'user'
                ? 'self-end bg-blue-200'
                : 'self-start bg-gray-100 border'
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="mt-2 flex items-center space-x-2 px-4">
        <input
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
          type="text"
          placeholder="Type your message…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
        >
          {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
    </div>
  );
}