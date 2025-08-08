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

def main():
    assert os.path.isdir(LOCAL_DIR), f"Missing folder: {LOCAL_DIR}"

    # Build base manifest
    manifest = {
        "model_id":         MODEL_SLUG,
        "display_name":     MODEL_SLUG.replace("-", " ").title(),
        "version":          str(date.today()),
        "license":          LICENSE,
        "format":           "safetensors",
        "max_sequence_len": guess_max_seq_len(),
        "tokenizer_url":        None,
        "tokenizer_config":     file_url_if_exists("tokenizer_config.json"),
        "generation_config":    file_url_if_exists("generation_config.json"),
        "special_tokens_map":   file_url_if_exists("special_tokens_map.json"),
        "shards": []
    }

    # Prefer tokenizer.json; otherwise tokenizer.model
    tok_url = file_url_if_exists("tokenizer.json") or file_url_if_exists("tokenizer.model")
    manifest["tokenizer_url"] = tok_url

    # Add shard entries (deterministic order)
    shard_files = sorted([f for f in os.listdir(LOCAL_DIR) if f.endswith(".safetensors")])
    if not shard_files:
        raise SystemExit(f"No .safetensors shards found in {LOCAL_DIR}")

    for fname in shard_files:
        path = os.path.join(LOCAL_DIR, fname)
        manifest["shards"].append({
            "url":    f"{URL_PREFIX}/{fname}",
            "sha256": sha256_file(path),
            "size":   os.path.getsize(path)
        })

    out_path = os.path.join(LOCAL_DIR, "manifest.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print("✅ Wrote", out_path)
    print("   shards:", len(shard_files))
    print("   tokenizer_url:", manifest["tokenizer_url"])

if __name__ == "__main__":
    main()