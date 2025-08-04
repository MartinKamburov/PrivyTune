import { pipeline, TextGenerationPipeline, env } from '@xenova/transformers';
import type { Manifest } from '../models/manifest';

export async function loadLocalModel(
  manifest: Manifest
): Promise<TextGenerationPipeline> {
  const modelRoot = manifest.tokenizer_url.replace(/tokenizer\.json$/, '');

  const opts: any = {
    quantized:        true,
    local_files_only: true,
    fetch:            (env as any).fetch,   // ★ pass the hook
  };

  return (await pipeline('text-generation', modelRoot, opts)) as TextGenerationPipeline;
}