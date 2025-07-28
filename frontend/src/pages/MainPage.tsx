import React, { useState, useRef, useEffect, useCallback } from 'react';
import { downloadAndCacheShards } from '../utils/LlmShardDownloader';
import { loadLocalModel } from '../utils/LoadLocalModel';
import { TextGenerationPipeline } from '@xenova/transformers';

const API_BASE = import.meta.env.VITE_API_URL;

const modelOptions = ['Phi-3-mini-4k', 'Gemma 2B'];

export default function PrivyTuneChat() {
  const [models, setModels] = useState<string[]>([]);
  const [manifest, setManifest] = useState<any>(null);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [pipeline, setPipeline] = useState<TextGenerationPipeline | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
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

  // ─────────── download shards + spin-up WebGPU pipeline ───────────
  const handleDownload = useCallback(async () => {
    console.log("It got into handleDownload!")

    if (!manifest || loading) return;     // guard

    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: manifest.shards.length + 1 });

    try {
      // 1) download + cache shards & tokenizer
      await downloadAndCacheShards(manifest, (done, total) => {
        setProgress({ done, total });
      });;

      // 2) initialize model in WebGPU (this pulls from IndexedDB via env.fetch)
      const p = await loadLocalModel(manifest);
      console.log("Here is the variable p: ", p);
      setPipeline(p);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [manifest, loading]);

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
              className="btn btn-primary text-white px-4 py-2 rounded hover:bg-green-700 transition"
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
            <button onClick={handleDownload} disabled={loading || !!pipeline} className="btn btn-primary text-white px-4 py-1 rounded hover:bg-blue-700 transition">
              { pipeline
                  ? 'Model Loaded'
                  : loading
                    ? `Downloading… (${progress.done}/${progress.total})`
                    : 'Download Model Locally' }
            </button>

            {loading && (
              <div className="mt-2">
                {/* HTML5 <progress> */}
                <progress
                  className="w-full"
                  value={progress.done}
                  max={progress.total}
                />
                <div className="text-sm text-gray-600">
                  {Math.floor((progress.done / progress.total) * 100)}%
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}