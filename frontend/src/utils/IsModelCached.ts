import * as idbKeyval from 'idb-keyval';
import type { Manifest } from '../models/manifest';

export async function isModelCached(manifest: Manifest): Promise<boolean> {
  // Base URL for all of the extra JSONs sits alongside tokenizer.json
  const base = manifest.tokenizer_url.replace(/tokenizer\.json$/, '');

  // The pipeline will try to load these files locally:
  const extraFiles = [
    // The tokenizer itself
    manifest.tokenizer_url,
    // The four config JSONs
    `${base}config.json`,
    `${base}generation_config.json`,
    `${base}special_tokens_map.json`,
    `${base}tokenizer_config.json`,
  ];

  // Combine shards + extras
  const allUrls = [
    ...manifest.shards.map((s) => s.url),
    ...extraFiles,
  ];

  // Probe IndexedDB for each one
  const results = await Promise.all(
    allUrls.map((url) => idbKeyval.get<ArrayBuffer | object>(url))
  );

  // Only true if everything was found
  return results.every((r) => r != null);
}