import { pipeline, TextGenerationPipeline, env } from '@xenova/transformers';
import * as idbKeyval from 'idb-keyval';

(env as any).fetch = async (url: string, init?: RequestInit) => {
  const cached = await idbKeyval.get<ArrayBuffer | object>(url);
  if (cached) {
    const body =
      url.endsWith('.json')
        ? JSON.stringify(cached)
        : (cached as ArrayBuffer);

    const headers: HeadersInit =
      url.endsWith('.json') ? { 'Content-Type': 'application/json' } : {};

    return new Response(body, { headers });
  }
  return fetch(url, init);
};

// Disable remote downloads (same effect as localFilesOnly = true)
env.allowRemoteModels = false;

export interface Manifest {
  model_id: string;
  tokenizer_url: string;
  shards: { url: string; sha256: string }[];
}

export async function loadLocalModel(
  manifest: Manifest
): Promise<TextGenerationPipeline> {
  const gen = await pipeline(
    'text-generation',
    manifest.model_id,
    { quantized: true }           // PretrainedOptions is now satisfied
    ) as TextGenerationPipeline;

  return gen;
}