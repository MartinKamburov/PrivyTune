export type QuantizationKind = "int4" | "int8" | null | string;

export interface OnnxInfo {
  /** URL to the ONNX graph file (e.g., .../onnx/model_quantized.onnx or .../onnx/model.onnx) */
  model: string;
  /** URL to external tensor data if present (many quantized builds are single-file and set this to null/omitted) */
  external_data?: string | null;
  /** Optional integrity info (present if the generator computed it) */
  sha256?: string;
  external_sha256?: string | null;
  /** Simple label inferred from filename (e.g., "int8", "int4"); may be null */
  quantization?: QuantizationKind;
  /** Size in bytes of the ONNX graph file (if known) */
  size?: number;
}

export interface ShardInfo {
  /** Public or private URL to a .safetensors shard (training use-case) */
  url: string;
  /** Optional integrity + size */
  sha256?: string;
  size?: number;
}

/**
 * Canonical manifest schema produced by make_manifest.py
 * - For browser inference, prefer `onnx` block.
 * - For training, use `shards` (PyTorch safetensors).
 */
export interface Manifest {
  /** Slug used in paths (e.g., "qwen2.5-1.5b-instruct") */
  model_id: string;
  /** Human-readable name */
  display_name?: string;
  /** Version string (often an ISO date) */
  version?: string;
  /** OSS license label (e.g., "apache-2.0") */
  license?: string;

  /** Overall artifact format preference for the frontend */
  format?: ManifestFormat;

  /** Max context length; derived from tokenizer/config when available */
  max_sequence_len?: number;

  /** Tokenizer locations (keep a single canonical copy at model root) */
  tokenizer_url: string;                // tokenizer.json or tokenizer.model
  tokenizer_config?: string | null;
  generation_config?: string | null;
  special_tokens_map?: string | null;

  /** Fallbacks for GPT-2 style tokenizers */
  tokenizer_vocab_url?: string;          // vocab.json
  tokenizer_merges_url?: string;         // merges.txt

  /** ONNX block (preferred for browser). May be absent if only shards are provided. */
  onnx?: OnnxInfo | null;

  /** Optional list of safetensor shards (training/server use). Can be empty. */
  shards: ShardInfo[];
}

/* ---------- small helpers you can import in TS code (optional) ---------- */

/** Returns the preferred ONNX URL if present, otherwise null. */
export function getOnnxUrl(m: Manifest): string | null {
  return m.onnx?.model ?? null;
}

/** Returns the external data URL if present (some builds are single-file). */
export function getOnnxExternalUrl(m: Manifest): string | null {
  return m.onnx?.external_data ?? null;
}