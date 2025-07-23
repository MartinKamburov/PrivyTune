import os
# Library used for the AWS connection
import boto3
from dotenv import load_dotenv

load_dotenv()

BUCKET = os.getenv("S3_BUCKET")
REGION = os.getenv("AWS_REGION")
KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
SECRET = os.getenv("AWS_SECRET_ACCESS_KEY")

# Local folder where your shards live
OUT_DIR = "shard-models/phi-3-mini-4k-instruct"
# Optional S3 “folder” inside your bucket
PREFIX  = "phi-3-mini-4k-instruct/"

# Create the S3 client
s3 = boto3.client(
    "s3",
    aws_access_key_id=KEY_ID,
    aws_secret_access_key=SECRET,
    region_name=REGION,
)

# Walk and upload
for root, _, files in os.walk(OUT_DIR):
    for fname in files:
        local_path = os.path.join(root, fname)
        # Build S3 key: prefix + relative path under OUT_DIR
        relative = os.path.relpath(local_path, OUT_DIR)
        s3_key   = f"{PREFIX}{relative}"

        print(f"Uploading {local_path} → s3://{BUCKET}/{s3_key}")
        s3.upload_file(
            Filename=local_path,
            Bucket=BUCKET,
            Key=s3_key,
            ExtraArgs={
                # "ACL":           "public-read",
                "CacheControl":  "max-age=31536000",
            }
        )

print("Upload complete!")