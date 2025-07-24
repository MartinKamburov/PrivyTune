import React, { useState, useRef, useEffect } from 'react';
import { downloadAndCacheShards } from '../utils/LlmShardDownloader';

const API_BASE = import.meta.env.VITE_API_URL;

const modelOptions = ['Phi-3-mini-4k', 'Gemma 2B'];

export default function PrivyTuneChat() {
  const [models, setModels] = useState<string[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch list of available models from backend on mount
  useEffect(() => {
    const url = `${API_BASE}/api/v1/models`;
    console.log("Fetching models from", url);
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<string[]>;
      })
      .then((data) => {
        // `data` is string[]
        setModels(data);
        if (data.length) setSelectedModel(data[0]);
      })
      .catch((err) => console.error('Failed to fetch models:', err));
  }, []);

  // console.log("Here are the models ", models);

  // Fetch manifest whenever selectedModel changes
  useEffect(() => {
    if (!selectedModel) return;
    fetch(`${API_BASE}/api/v1/models/${selectedModel}`)
      .then((res) => res.json())
      .then((data) => setManifest(data))
      .catch((err) => console.error('Failed to fetch manifest:', err));
  }, [selectedModel]);

  console.log("Here is the manifest data: ", manifest);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleModelChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedModel(e.target.value);
  }

  async function handleDownload() {
    if (!manifest) return;
    setLoading(true);
    setError(null);

    try {
      // 1) download + cache shards & tokenizer
      await downloadAndCacheShards(manifest);

      // 2) initialize the model in WebGPU
      // const p = await loadLocalModel(manifest);
      // setPipeline(p);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function handleSend() {
    if (!input.trim()) return;
    setMessages((msgs) => [...msgs, { role: 'user', text: input.trim() }]);
    setInput('');
    setTimeout(() => {
      setMessages((msgs) => [...msgs, { role: 'assistant', text: `Echo (${selectedModel}): ${input.trim()}` }]);
    }, 500);
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-3xl w-full p-4 flex flex-col h-full">

        {/* Chat box with fixed height */}
        <div className="h-[80vh] w-full border rounded-lg overflow-hidden flex flex-col">
          {/* Messages area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`px-3 py-2 rounded-lg max-w-xs whitespace-pre-wrap ` +
                  (msg.role === 'user'
                    ? 'self-end bg-blue-200'
                    : 'self-start bg-white border')}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="p-3 border-t flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
              placeholder="Type your message..."
            />
            <button
              onClick={handleSend}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Send
            </button>

            <select
                value={selectedModel}
                onChange={handleModelChange}
                className="border rounded px-3 py-1 focus:outline-none focus:ring"
            >
                {models.map((m) => (
                <option key={m} value={m}>{m}</option>
                ))}
            </select>
            <button
                onClick={handleDownload}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 transition"
            >
                Download Model Locally
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}