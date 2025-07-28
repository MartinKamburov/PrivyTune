import { ShardEntry } from "./ShardEntry";

export interface ShardEntry {
  url: string;
  sha256: string;
}

export interface Manifest {
    display_name: string;
    license: string;
    max_sequence_len: number;
    model_id: string;
    shards: ShardEntry[];
    tokenizer_url: string;
    version: string;
}