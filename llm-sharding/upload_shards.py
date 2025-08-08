import os, mimetypes
import boto3
from dotenv import load_dotenv

load_dotenv()
BUCKET = os.getenv("S3_BUCKET")
REGION = os.getenv("AWS_REGION")
KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
SECRET = os.getenv("AWS_SECRET_ACCESS_KEY")

OUT_DIR = "shard-models/qwen2.5-1.5b-instruct"
PREFIX  = "qwen2.5-1.5b-instruct/"

assert all([BUCKET, REGION, KEY_ID, SECRET]), "Missing AWS env vars"

s3 = boto3.client(
    "s3",
    aws_access_key_id=KEY_ID,
    aws_secret_access_key=SECRET,
    region_name=REGION,
)

def extra_args_for(file_name: str) -> dict:
    ctype, _ = mimetypes.guess_type(file_name)
    if not ctype or file_name.endswith((".safetensors", ".onnx", ".onnx_data", ".model")):
        ctype = "application/octet-stream"
    # Short cache for manifest; long for everything else
    cache = "public, max-age=300" if os.path.basename(file_name) == "manifest.json" \
            else "public, max-age=31536000, immutable"
    return {
        "ContentType": ctype,
        "CacheControl": cache,
        # Uncomment ONLY if you want public objects and your bucket policy allows it:
        # "ACL": "public-read",
        # Optional encryption:
        # "ServerSideEncryption": "AES256",
    }

for root, _, files in os.walk(OUT_DIR):
    for fname in files:
        local_path = os.path.join(root, fname)
        rel = os.path.relpath(local_path, OUT_DIR).replace("\\", "/")
        key = f"{PREFIX}{rel}"
        print(f"Uploading {local_path} → s3://{BUCKET}/{key}")
        s3.upload_file(local_path, BUCKET, key, ExtraArgs=extra_args_for(local_path))

print("✅ Upload complete!")