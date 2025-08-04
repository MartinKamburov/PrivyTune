import * as idbKeyval from 'idb-keyval';
import { sha256 } from './crypto';
import type { Manifest } from '../models/manifest';

export async function downloadAndCacheShards(
  manifest: Manifest,
  onProgress?: (completed: number, total: number) => void
) {
  // 1) Build the full list of URLs we need to cache:
  const base = manifest.tokenizer_url.replace(/tokenizer\.json$/, '');
  const jsonFiles = [
    manifest.tokenizer_url,             // tokenizer.json
    `${base}config.json`,
    `${base}generation_config.json`,
    `${base}special_tokens_map.json`,
    `${base}tokenizer_config.json`,
  ];
  // The total work is: number of shards + number of JSON files
  const total = manifest.shards.length + jsonFiles.length;
  let done = 0;

  // 1) Download & cache each shard
  for (const { url, sha256: expected } of manifest.shards) {
    const cached = await idbKeyval.get<ArrayBuffer>(url);
    if (cached) {
      const actual = await sha256(cached);
      if (actual === expected) {
        done++;
        onProgress?.(done, total);
        continue;
      }
    }

    // fetch fresh shard
    const buf = await fetch(url).then(r => r.arrayBuffer());
    const actual = await sha256(buf);
    if (actual !== expected) {
      throw new Error(`Checksum mismatch for shard: ${url}`);
    }
    await idbKeyval.set(url, buf);
    done++;
    onProgress?.(done, total);
  }

  // 3) Download & cache all JSON files
  for (const url of jsonFiles) {
    // skip if already cached
    if (await idbKeyval.get(url)) {
      done++;
      onProgress?.(done, total);
      continue;
    }

    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`⚠️ Failed to fetch ${url}: ${resp.status}`);
      // we could choose to throw here, but for resilience we just log and continue
      continue;
    }

    // ensure JSON-like response
    const ctype = resp.headers.get('content-type') || '';
    if (!ctype.includes('json')) {
      console.warn(`⚠️ ${url} returned ${ctype} — parsing as JSON anyway.`);
    }

    const json = await resp.json();
    await idbKeyval.set(url, json);

    done++;
    onProgress?.(done, total);
  }

}