import { pipeline, TextGenerationPipeline, env } from '@xenova/transformers';
import * as idbKeyval from 'idb-keyval';
import type { Manifest } from '../models/manifest';

// 1) intercept fetches so that any request for a shard or tokenizer URL
//    comes straight from IndexedDB if available
;(env as any).fetch = async (url: string, init?: RequestInit) => {
  console.log('env.fetch →', url);
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
  const resp = await fetch(url, init);
  console.log('network fetch', url, '→', resp.status, resp.headers.get('content-type'));
  return resp;
};

// 2) tell the library to never go to the Hub
env.allowRemoteModels = false;

/**
 * Given a manifest that lists your shards under
 *   https://.../model_id/model-000XX-of-000YY.safetensors
 * this returns a WebGPU-backed text-generation pipeline
 * that reads those shards out of IndexedDB.
 */
export async function loadLocalModel(
  manifest: Manifest
): Promise<TextGenerationPipeline> {
  // Build a single options object and cast to any to bypass TS checks:
  const opts: any = {
    quantized:       true,             // INT4
    local_files_only: true,            // no Hub calls
    fetch:            (env as any).fetch,
  };

  const modelRoot = 'https://d3b5vir3v79bpg.cloudfront.net/phi-3-mini-4k-instruct';

  // Pass that to pipeline:
  const gen = await pipeline(
    'text-generation',     // task
    modelRoot,     // your CDN folder manifest.model_id
    opts                   // casted any
  ) as TextGenerationPipeline;

  return gen;
}