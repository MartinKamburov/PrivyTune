import * as idbKeyval from 'idb-keyval';
import type { Manifest } from '../models/manifest';

export async function isModelCached(manifest: Manifest): Promise<boolean> {
  // test each shard url + tokenizer_url
  const allUrls = manifest.shards.map(s => s.url)
                     .concat(manifest.tokenizer_url);
  // try to get each from IDB
  const results = await Promise.all(
    allUrls.map(url => idbKeyval.get<ArrayBuffer|object>(url))
  );
  // if any is missing, it’s not fully cached
  return results.every(r => r != null);
}