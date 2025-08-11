import os, json, hashlib
from datetime import date
from dotenv import load_dotenv

load_dotenv()

# ---- customize this per model ----
MODEL_SLUG = "qwen2.5-1.5b-instruct"
# ----------------------------------
LOCAL_DIR  = f"shard-models/{MODEL_SLUG}"
CLOUDFRONT = os.getenv("CLOUD_FRONT_URL", "").rstrip("/")
URL_PREFIX = f"https://{CLOUDFRONT}/{MODEL_SLUG}" if CLOUDFRONT else f"/{MODEL_SLUG}"
LICENSE    = os.getenv("MODEL_LICENSE", "apache-2.0")  # override via .env if needed

def sha256_file(path, chunk=1024 * 1024):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            b = f.read(chunk)
            if not b: break
            h.update(b)
    return h.hexdigest()

def file_url_if_exists(name: str):
    p = os.path.join(LOCAL_DIR, name)
    return f"{URL_PREFIX}/{name}" if os.path.exists(p) else None

def guess_max_seq_len():
    # Prefer tokenizer_config.model_max_length if present; otherwise fall back to config.max_position_embeddings
    tcfg_path = os.path.join(LOCAL_DIR, "tokenizer_config.json")
    if os.path.exists(tcfg_path):
        try:
            with open(tcfg_path, "r", encoding="utf-8") as f:
                tcfg = json.load(f)
            mml = tcfg.get("model_max_length")
            if isinstance(mml, int) and mml > 0 and mml < 10**7:
                return mml
        except Exception:
            pass
    cfg_path = os.path.join(LOCAL_DIR, "config.json")
    if os.path.exists(cfg_path):
        try:
            with open(cfg_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            mpe = cfg.get("max_position_embeddings")
            if isinstance(mpe, int) and mpe > 0:
                return mpe
        except Exception:
            pass
    return 2048  # conservative default

def find_onnx():
    """Return dict with ONNX URLs/checksums if onnx/ exists, else None."""
    onnx_dir = os.path.join(LOCAL_DIR, "onnx")
    if not os.path.isdir(onnx_dir):
        return None

    # Prefer a deterministic model file: model_quantized.onnx > model.onnx > any .onnx
    ranked = []
    for f in os.listdir(onnx_dir):
        if f.lower().endswith(".onnx"):
            ranked.append(f)
    if not ranked:
        return None

    def rank(fname: str) -> int:
        lf = fname.lower()
        if "model_quantized.onnx" in lf: return 0
        if "model.onnx" in lf:          return 1
        return 2

    ranked.sort(key=rank)
    model_fname = ranked[0]
    model_path  = os.path.join(onnx_dir, model_fname)

    # Common external data naming patterns
    base = os.path.splitext(model_fname)[0]
    candidates = [
        f"{base}.onnx_data",             # model.onnx_data / model_quantized.onnx_data
        f"{base}.data",                  # some exporters use .data
    ]
    ext_url = None
    ext_sha = None
    for cand in candidates:
        cand_path = os.path.join(onnx_dir, cand)
        if os.path.exists(cand_path):
            ext_url = f"{URL_PREFIX}/onnx/{cand}"
            ext_sha = sha256_file(cand_path)
            break

    return {
        "model":          f"{URL_PREFIX}/onnx/{model_fname}",
        "external_data":  ext_url,
        "sha256":         sha256_file(model_path),
        "external_sha256": ext_sha,
        # naive hint: put "int8"/"int4" in filename to annotate quantization if you like
        "quantization":   ("int8" if "int8" in model_fname.lower() else
                           "int4" if "int4" in model_fname.lower() or "q4" in model_fname.lower()
                           else None),
        "size":           os.path.getsize(model_path)
    }

def main():
    assert os.path.isdir(LOCAL_DIR), f"Missing folder: {LOCAL_DIR}"

    # Build base manifest
    manifest = {
        "model_id":         MODEL_SLUG,
        "display_name":     MODEL_SLUG.replace("-", " ").title(),
        "version":          str(date.today()),
        "license":          LICENSE,
        "format":           None,  # set below
        "max_sequence_len": guess_max_seq_len(),
        "tokenizer_url":        None,
        "tokenizer_config":     file_url_if_exists("tokenizer_config.json"),
        "generation_config":    file_url_if_exists("generation_config.json"),
        "special_tokens_map":   file_url_if_exists("special_tokens_map.json"),
        "onnx":                 None,   # filled if onnx/ exists
        "shards":               []      # filled if .safetensors exist
    }

    # Prefer tokenizer.json; otherwise tokenizer.model; final fallback vocab/merges (BPE)
    tok_url = file_url_if_exists("tokenizer.json") or file_url_if_exists("tokenizer.model")
    if not tok_url and os.path.exists(os.path.join(LOCAL_DIR, "vocab.json")) and os.path.exists(os.path.join(LOCAL_DIR, "merges.txt")):
        # expose both for older GPT-2 style tokenizers
        manifest["tokenizer_vocab_url"]  = f"{URL_PREFIX}/vocab.json"
        manifest["tokenizer_merges_url"] = f"{URL_PREFIX}/merges.txt"
    manifest["tokenizer_url"] = tok_url

    # ONNX (preferred for browser)
    onnx_info = find_onnx()
    if onnx_info:
        manifest["onnx"] = onnx_info
        manifest["format"] = "onnx"

    # Sharded safetensors (optional; useful for training)
    shard_files = sorted([f for f in os.listdir(LOCAL_DIR) if f.endswith(".safetensors")])
    for fname in shard_files:
        path = os.path.join(LOCAL_DIR, fname)
        manifest["shards"].append({
            "url":    f"{URL_PREFIX}/{fname}",
            "sha256": sha256_file(path),
            "size":   os.path.getsize(path)
        })

    # If no ONNX but there are shards, set format accordingly; if neither present, warn.
    if not manifest["format"]:
        manifest["format"] = "safetensors" if manifest["shards"] else "unknown"

    out_path = os.path.join(LOCAL_DIR, "manifest.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print("✅ Wrote", out_path)
    print("   format:", manifest["format"])
    print("   has_onnx:", bool(onnx_info))
    print("   shards:", len(shard_files))
    print("   tokenizer_url:", manifest.get("tokenizer_url") or
                              f"{manifest.get('tokenizer_vocab_url')} + {manifest.get('tokenizer_merges_url')}")


if __name__ == "__main__":
    main()