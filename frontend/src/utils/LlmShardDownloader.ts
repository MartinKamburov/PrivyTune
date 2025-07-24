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


export async function downloadAndCacheShards(manifest: Manifest) {
    for (const { url, sha256: expected } of manifest.shards) {
    // 1) attempt to reuse cached data
    const cached = await idbKeyval.get<ArrayBuffer>(url);
    if (cached) {
      const actual = await sha256(cached);
      if (actual === expected) {
        continue;
      }
    }

    // 2) fetch anew
    const res = await fetch(url);
    const buf = await res.arrayBuffer();

    // 3) verify integrity
    const actual = await sha256(buf);
    if (actual !== expected) {
      throw new Error(`Checksum mismatch for shard: ${url}`);
    }

    // 4) store in IndexedDB
    await idbKeyval.set(url, buf);
  }

}