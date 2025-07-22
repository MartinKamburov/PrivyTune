import os
import boto3
from dotenv import load_dotenv

load_dotenv()
BUCKET = os.getenv("S3_BUCKET")          # e.g. "my-privytune-models"
PREFIX = "privytune/"           # folder in your bucket

s3 = boto3.client("s3",
    aws_access_key_id    = os.getenv("AWS_ACCESS_KEY_ID"),
    aws_secret_access_key= os.getenv("AWS_SECRET_ACCESS_KEY"),
    region_name          = os.getenv("AWS_REGION"),
)

# Walk local shard directory
for root, _, files in os.walk(OUT_DIR):
    for fname in files:
        local_path = os.path.join(root, fname)
        # build the key so it mirrors your local structure
        relative = os.path.relpath(local_path, OUT_DIR)
        s3_key = f"{PREFIX}{relative}"

        print(f"Uploading {local_path} → s3://{BUCKET}/{s3_key}")
        s3.upload_file(
            Filename=local_path,
            Bucket=BUCKET,
            Key=s3_key,
            ExtraArgs={
                "ACL": "public-read",
                "CacheControl": "max-age=31536000"
            }
        )
print("Upload complete!")