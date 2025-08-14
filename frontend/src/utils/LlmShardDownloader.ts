import * as idbKeyval from 'idb-keyval';
import { sha256 } from './crypto';
import type { Manifest } from '../models/manifest';

/** Check if the ONNX files referenced by the manifest are already cached. */
export async function isOnnxCached(manifest: Manifest): Promise<boolean> {
  if (!manifest.onnx?.model) return false;

  const urls = [
    manifest.onnx.model,
    ...(manifest.onnx.external_data ? [manifest.onnx.external_data] : []),
  ];

  // Prefer Cache Storage (disk-backed). Fall back to IDB presence.
  const cache = await caches.open("model-cache-v1");
  for (const url of urls) {
    const hit = (await cache.match(url)) || (await idbKeyval.get(url));
    if (!hit) return false;
  }
  return true;
}

/** Stream a ReadableStream to an ArrayBuffer with progress (no giant RAM spike). */
async function streamToArrayBuffer(
  stream: ReadableStream<Uint8Array>,
  totalBytes: number | null,
  onChunk?: (loaded: number, total: number | null) => void
): Promise<ArrayBuffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value!);
    loaded += value!.byteLength;
    onChunk?.(loaded, totalBytes);
  }
  // Concatenate
  const out = new Uint8Array(loaded);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.byteLength;
  }
  return out.buffer;
}

export async function downloadAndCacheShards(
  manifest: Manifest,
  onProgress?: (completed: number, total: number) => void
) {
  // // 1) Build list of all JSON URLs alongside tokenizer.json
  const base = manifest.tokenizer_url.replace(/tokenizer\.json$/, '');
  // console.log("Here is the base that we are using: ", base);

  const jsonFiles = [
    manifest.tokenizer_url,            // tokenizer.json
    `${base}config.json`,
    `${base}generation_config.json`,
    `${base}special_tokens_map.json`,
    `${base}tokenizer_config.json`,
  ];

  // // 2) Compute total: shards + JSONs
  // const total = manifest.shards.length + jsonFiles.length;
  // let done = 0;

  // // 3) Download & cache each shard (with checksum verification)
  // for (const { url, sha256: expected } of manifest.shards) {
  //   const existing = await idbKeyval.get<ArrayBuffer>(url);
  //   if (existing) {
  //     const actual = await sha256(existing);
  //     if (actual === expected) {
  //       done++;
  //       onProgress?.(done, total);
  //       continue;
  //     }
  //   }

  //   const buffer = await fetch(url).then((r) => r.arrayBuffer());
  //   const actual = await sha256(buffer);
  //   if (actual !== expected) {
  //     throw new Error(`Checksum mismatch for shard: ${url}`);
  //   }

  //   await idbKeyval.set(url, buffer);
  //   done++;
  //   onProgress?.(done, total);
  // }

  // // 4) **Always** re-download & cache each JSON file (no skip-if-cached)
  // for (const url of jsonFiles) {
  //   const resp = await fetch(url);
  //   if (!resp.ok) {
  //     console.warn(`⚠️ Failed to fetch ${url}: ${resp.status}`);
  //     // still count it so progress bar moves forward
  //     done++;
  //     onProgress?.(done, total);
  //     continue;
  //   }

  //   // parse as JSON regardless of Content-Type
  //   const json = await resp.json();
  //   await idbKeyval.set(url, json);

  //   done++;
  //   onProgress?.(done, total);
  // }

  // ─────────────────────────────────────────────────────────────
  // 5) NEW: download & cache the quantized ONNX blob
  //    (so `pipeline()` with quantized=true can read it locally)

  // Build the URL where you uploaded it:
  //   e.g. https://…/phi-3-mini-4k-instruct/onnx/model_quantized.onnx
  if (!manifest.onnx?.model) {
    throw new Error("Manifest has no onnx.model");
  }
  // const urls = [manifest.onnx.model, ...(manifest.onnx.external_data ? [manifest.onnx.external_data] : [])];
  const urls: string[] = [
    manifest.onnx.model,
    ...(manifest.onnx.external_data ? [manifest.onnx.external_data] : []),
  ];


  console.log("here is the urls that is getting used: ", urls);

  const cache = await caches.open("model-cache-v1");
  const total = urls.length;
  let done = 0;

  for (const url of urls) {
    // Skip if already present (either Cache Storage OR IDB)
    const inCache = await cache.match(url);
    const inIDB = await idbKeyval.get(url);
    if (!inCache && !inIDB) {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

      if (res.body) {
        // Stream → tee: one side for Cache Storage, one we assemble for IDB
        const [forProgress, forCache] = res.body.tee();
        const len = Number(res.headers.get("content-length") || 0) || null;

        // Start caching immediately
        const putPromise = cache.put(url, new Response(forCache, { headers: res.headers }));

        // Assemble ArrayBuffer for IDB and update fractional progress
        const reader = forProgress.getReader();
        let loaded = 0;
        const chunks: Uint8Array[] = [];
        while (true) {
          const { done: d, value } = await reader.read();
          if (d) break;
          chunks.push(value!);
          loaded += value!.byteLength;
          if (len) onProgress?.(Math.min(done + loaded / len, total), total);
        }
        const out = new Uint8Array(loaded);
        let off = 0;
        for (const c of chunks) { out.set(c, off); off += c.byteLength; }
        await idbKeyval.set(url, out.buffer);

        await putPromise;
      } else {
        // No stream? Cache the whole response and also store to IDB
        await cache.put(url, res.clone());
        await idbKeyval.set(url, await res.arrayBuffer());
      }
    }

    done += 1;
    onProgress?.(done, total);
  }
}