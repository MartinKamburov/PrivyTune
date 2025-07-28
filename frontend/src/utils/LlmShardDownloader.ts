// This file is used to store the shard key-val pairs into the IndexedDB
import * as idbKeyval from 'idb-keyval';
import { sha256 } from './crypto';

interface ShardEntry {
  url: string;
  sha256: string;
}

interface Manifest {
    display_name: string;
    license: string;
    max_sequence_len: number;
    model_id: string;
    shards: ShardEntry[];
    tokenizer_url: string;
    version: string;
}


export async function downloadAndCacheShards(
  manifest: Manifest,
  onProgress?: (completed: number, total: number) => void
) {
  const total = manifest.shards.length + 1; // +1 for tokenizer.json
  let done = 0;

  // 1) Download & cache each shard
  for (const { url, sha256: expected } of manifest.shards) {
    // Attempt to reuse cached data
    const cached = await idbKeyval.get<ArrayBuffer>(url);
    if (cached) {
      const actual = await sha256(cached);
      if (actual === expected) {
        // Count it as done and report progress
        done++;
        onProgress?.(done, total);
        continue;
      }
    }

    // Fetch fresh
    const buf = await fetch(url).then(r => r.arrayBuffer());

    // Verify integrity
    const actual = await sha256(buf);
    if (actual !== expected) {
      throw new Error(`Checksum mismatch for shard: ${url}`);
    }

    // Store in IndexedDB
    await idbKeyval.set(url, buf);

    // Count it and report
    done++;
    onProgress?.(done, total);
  }

  // 2) Finally, download & cache the tokenizer.json
  {
    const tokUrl = manifest.tokenizer_url;
    const tok    = await fetch(tokUrl).then(r => r.json());
    await idbKeyval.set(tokUrl, tok);

    done++;
    onProgress?.(done, total);
  }
}