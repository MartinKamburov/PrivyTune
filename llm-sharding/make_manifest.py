import os
import json
import hashlib
from dotenv import load_dotenv

load_dotenv()

CLOUD_FRONT = os.getenv("CLOUD_FRONT_URL")

# Source directory and public URL prefix
LOCAL_DIR   = "shard-models/phi-3-mini-4k-instruct"
URL_PREFIX  = f"https://{CLOUD_FRONT}/phi-3-mini-4k-instruct"

# Core metadata
manifest = {
    "model_id":        "phi-3-mini-4k-instruct",
    "display_name":    "Phi-3 Mini 4K Instruct (INT4)",
    "version":         "2025-07-23",
    "license":         "mit",
    "max_sequence_len": 4096,
    "tokenizer_url":   f"{URL_PREFIX}/tokenizer.json",
    "shards":          []
}

# Loop over every .safetensors file and compute its SHA-256
for fname in sorted(os.listdir(LOCAL_DIR)):
    if not fname.endswith(".safetensors"):
        continue
    path = os.path.join(LOCAL_DIR, fname)
    data = open(path, "rb").read()
    checksum = hashlib.sha256(data).hexdigest()
    manifest["shards"].append({
        "url":    f"{URL_PREFIX}/{fname}",
        "sha256": checksum
    })

# Write out manifest.json
with open(os.path.join(LOCAL_DIR, "manifest.json"), "w") as f:
    json.dump(manifest, f, indent=2)

print("Wrote", os.path.join(LOCAL_DIR, "manifest.json"))