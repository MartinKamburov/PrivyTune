// src/pages/PrivyTuneChat.tsx
import React, { useState, useEffect, useCallback } from 'react';
import type { TextGenerationPipeline } from '@huggingface/transformers';
import { downloadAndCacheShards } from '../utils/LlmShardDownloader';
import { loadLocalModel }                  from '../utils/LoadLocalModel';
import { isModelCached }                   from '../utils/IsModelCached';
import { ChatUI }                          from '../components/ChatUI';
import type { Manifest } from '../models/manifest';

const API_BASE = import.meta.env.VITE_API_URL

export default function PrivyTuneChat() {
  const [models,        setModels]       = useState<string[]>([])
  const [selectedModel, setSelectedModel]= useState<string>('')
  const [manifest,      setManifest]     = useState<Manifest | null>(null)
  const [isCached,      setIsCached]     = useState(false)
  const [pipeline,      setPipeline]     = useState<TextGenerationPipeline | null>(null)

  const [loading,       setLoading]      = useState(false)
  const [error,         setError]        = useState<string | null>(null)
  const [progress,      setProgress]     = useState({ done: 0, total: 0 })

  // 1) load list of model IDs
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/models`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then(setModels)
      .catch(e => setError(`Failed to list models: ${e.message}`))
  }, [])

  // 2) fetch manifest when user picks a model
  useEffect(() => {
    if (!selectedModel) return
    fetch(`${API_BASE}/api/v1/models/${selectedModel}`)
      .then(r => { if (!r.ok) throw new Error(r.statusText); return r.json() })
      .then((m: Manifest) => {
        setManifest(m)
        setPipeline(null)
      })
      .catch(e => setError(`Failed to load manifest: ${e.message}`))
  }, [selectedModel])

  // 3) check IndexedDB cache
  useEffect(() => {
    if (!manifest) return
    ;(async () => {
      const ok = await isModelCached(manifest)
      setIsCached(ok)
    })()
  }, [manifest])

  // 4) download & initialize
  const handleDownload = useCallback(async () => {
    if (!manifest || loading || pipeline) return

    setLoading(true)
    setError(null)
    setProgress({ done: 0, total: 0 })

    try {
      // fetch + cache shards + all JSONs
      await downloadAndCacheShards(manifest, (done, total) => {
        setProgress({ done, total })
      })
      setIsCached(true)

      // spin up the offline pipeline
      const p = await loadLocalModel(manifest)
      setPipeline(p)

    } catch (e: any) {
      setError(`Error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }, [manifest, loading, pipeline])

  return (
    <div className="h-screen flex flex-col bg-gray-100 p-4 space-y-4">
      {/* ───────── Controls ───────── */}
      <div className="flex items-center space-x-2">
        <select
          className="border rounded px-3 py-1"
          value={selectedModel}
          onChange={e => setSelectedModel(e.target.value)}
        >
          <option value="" disabled>
            Select model…
          </option>
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <button
          onClick={handleDownload}
          disabled={loading || !!pipeline}
          className="btn btn-primary text-white px-4 py-1 rounded disabled:opacity-50"
        >
          {pipeline
            ? 'Model Loaded'
            : loading
              ? `Downloading… (${progress.done}/${progress.total})`
              : isCached
                ? 'Load Cached Model'
                : 'Download Model'}
        </button>
      </div>

      {error && <div className="text-red-600">{error}</div>}

      {/* ───────── Chat Area ───────── */}
      <div className="flex-1 border rounded-lg overflow-hidden bg-white">
        {pipeline ? (
          <ChatUI pipeline={pipeline} />
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">
            {loading
              ? 'Downloading model…'
              : 'Please download & load the model to chat.'}
          </div>
        )}
      </div>
    </div>
  )
}
