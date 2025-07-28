// src/utils/LoadLocalModel.ts
import { pipeline, TextGenerationPipeline, env } from '@xenova/transformers';
import * as idbKeyval from 'idb-keyval';

// 1) intercept fetches so that any request for a shard or tokenizer URL
//    comes straight from IndexedDB if available
;(env as any).fetch = async (url: string, init?: RequestInit) => {
  const cached = await idbKeyval.get<ArrayBuffer|object>(url);
  if (cached) {
    // JSON responses need the correct header
    if (url.endsWith('.json')) {
      return new Response(JSON.stringify(cached), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // otherwise it’s a binary shard
    return new Response(cached as ArrayBuffer);
  }
  // fallback (should never happen once fully cached)
  return fetch(url, init);
};

// 2) tell the library to never go to the Hub
env.allowRemoteModels = false;

export interface Manifest {
  model_id:     string;
  tokenizer_url:string;
  shards:       { url: string; sha256: string }[];
}

/**
 * Given a manifest that lists your shards under
 *   https://.../model_id/model-000XX-of-000YY.safetensors
 * this returns a WebGPU-backed text-generation pipeline
 * that reads those shards out of IndexedDB.
 */
export async function loadLocalModel(
  manifest: Manifest
): Promise<TextGenerationPipeline> {
  const gen = await pipeline(
    'text-generation',      // the task
    manifest.model_id,      // folder name on your CDN
    {
      quantized: true,      // INT4
      // you don’t need to specify device—Xenova picks WebGPU by default
    }
  ) as TextGenerationPipeline;

  return gen;
}