import { pipeline, env } from "@huggingface/transformers";
import type { Manifest } from '../models/manifest';

export async function loadLocalModel(
  manifest: Manifest
): Promise<any> {

  const modelType = (manifest as any).token_type ?? 'phi'; 

  const opts: any = {
    quantized:        true,
    local_files_only: true,
    fetch:            (env as any).fetch,
    modelType,
  };

  // pass **just** the model id, not the folder URL
  const gen = await pipeline(
    'text-generation',
    manifest.model_id,           // => "phi-3-mini-4k-instruct"
    opts
  );

  return gen;
}