import * as idbKeyval from 'idb-keyval';
import { sha256 } from './crypto';
import type { Manifest } from '../models/manifest';

export async function downloadAndCacheShards(
  manifest: Manifest,
  onProgress?: (completed: number, total: number) => void
) {
  // 1) Build list of all JSON URLs alongside tokenizer.json
  const base = manifest.tokenizer_url.replace(/tokenizer\.json$/, '');
  const jsonFiles = [
    manifest.tokenizer_url,            // tokenizer.json
    `${base}config.json`,
    `${base}generation_config.json`,
    `${base}special_tokens_map.json`,
    `${base}tokenizer_config.json`,
  ];

  // 2) Compute total: shards + JSONs
  const total = manifest.shards.length + jsonFiles.length;
  let done = 0;

  // 3) Download & cache each shard (with checksum verification)
  for (const { url, sha256: expected } of manifest.shards) {
    const existing = await idbKeyval.get<ArrayBuffer>(url);
    if (existing) {
      const actual = await sha256(existing);
      if (actual === expected) {
        done++;
        onProgress?.(done, total);
        continue;
      }
    }

    const buffer = await fetch(url).then((r) => r.arrayBuffer());
    const actual = await sha256(buffer);
    if (actual !== expected) {
      throw new Error(`Checksum mismatch for shard: ${url}`);
    }

    await idbKeyval.set(url, buffer);
    done++;
    onProgress?.(done, total);
  }

  // 4) **Always** re-download & cache each JSON file (no skip-if-cached)
  for (const url of jsonFiles) {
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`⚠️ Failed to fetch ${url}: ${resp.status}`);
      // still count it so progress bar moves forward
      done++;
      onProgress?.(done, total);
      continue;
    }

    // parse as JSON regardless of Content-Type
    const json = await resp.json();
    await idbKeyval.set(url, json);

    done++;
    onProgress?.(done, total);
  }

  // ─────────────────────────────────────────────────────────────
  // 5) NEW: download & cache the quantized ONNX blob
  //    (so `pipeline()` with quantized=true can read it locally)

  // Build the URL where you uploaded it:
  //   e.g. https://…/phi-3-mini-4k-instruct/onnx/model_quantized.onnx
  const onnxUrl = `${base}onnx/model_quantized.onnx`;

  // Only fetch+cache if not already in IDB
  if (!(await idbKeyval.get<ArrayBuffer>(onnxUrl))) {
    const res = await fetch(onnxUrl);
    if (!res.ok) {
      console.warn(`⚠️ Could not fetch ONNX quant file: ${res.status}`);
    } else {
      const onnxBuf = await res.arrayBuffer();
      await idbKeyval.set(onnxUrl, onnxBuf);
    }
  }

  // Count it as done (even if it failed, so UI doesn’t hang)
  done++;
  onProgress?.(done, total);
}