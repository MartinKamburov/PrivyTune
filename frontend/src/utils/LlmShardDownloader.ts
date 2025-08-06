import * as idbKeyval from 'idb-keyval';
import { sha256 } from './crypto';
import type { Manifest } from '../models/manifest';

export async function downloadAndCacheShards(
  manifest: Manifest,
  onProgress?: (completed: number, total: number) => void
) {
  // Build the list of all JSON URLs alongside tokenizer.json
  const base = manifest.tokenizer_url.replace(/tokenizer\.json$/, '');
  const jsonFiles = [
    manifest.tokenizer_url,            // tokenizer.json
    `${base}config.json`,
    `${base}generation_config.json`,
    `${base}special_tokens_map.json`,
    `${base}tokenizer_config.json`,
  ];

  // Total work = number of shards + number of JSONs
  const total = manifest.shards.length + jsonFiles.length;
  let done = 0;

  // 1) Download & cache each shard (with checksum)
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

  // 2) Download & cache all JSON files (no MIME‐type guard)
  for (const url of jsonFiles) {
    // skip if already cached
    if (await idbKeyval.get(url)) {
      done++;
      onProgress?.(done, total);
      continue;
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`⚠️ Failed to fetch ${url} (status ${resp.status})`);
      continue;
    }

    // parse & cache regardless of Content-Type
    const json = await resp.json();
    await idbKeyval.set(url, json);

    done++;
    onProgress?.(done, total);
  }
}