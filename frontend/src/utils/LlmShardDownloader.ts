import * as idbKeyval from 'idb-keyval';
import { sha256 } from './crypto';
import type { Manifest } from '../models/manifest';

export async function downloadAndCacheShards(
  manifest: Manifest,
  onProgress?: (completed: number, total: number) => void
) {
  const total = manifest.shards.length + 1; // +1 for tokenizer.json
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

  // 2) Finally, download & cache the tokenizer.json
  {
    const tokUrl = manifest.tokenizer_url;
    console.log('🔍 fetching tokenizer from:', tokUrl);
    const resp = await fetch(tokUrl);
    console.log('→ status:', resp.status, 'content-type:', resp.headers.get('content-type'));

    // only error on non-OK status
    if (!resp.ok) {
      throw new Error(`Failed to fetch tokenizer.json: ${resp.status} ${resp.statusText}`);
    }

    // warn if Content-Type isn’t JSON, but don’t throw
    const ctype = resp.headers.get('content-type') || '';
    if (!ctype.includes('json')) {
      // console.warn(`tokenizer.json came back as '${ctype}', attempting to parse anyway.`);
    }

    const tok = await resp.json();
    await idbKeyval.set(tokUrl, tok);

    done++;
    onProgress?.(done, total);
  }
}