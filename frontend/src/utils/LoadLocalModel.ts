import { pipeline, TextGenerationPipeline, env } from '@xenova/transformers';
import type { Manifest } from '../models/manifest';

export async function loadLocalModel(
  manifest: Manifest
): Promise<TextGenerationPipeline> {

  const opts: any = {
    quantized:        true,
    local_files_only: true,
    fetch:            (env as any).fetch,
  };

  // pass **just** the model id, not the folder URL
  const gen = await pipeline(
    'text-generation',
    manifest.model_id,           // => "phi-3-mini-4k-instruct"
    opts
  ) as TextGenerationPipeline;

  return gen;
}