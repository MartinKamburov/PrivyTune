import os
from dotenv import load_dotenv
from transformers import AutoModelForCausalLM, AutoTokenizer

# Load your HUGGING_FACE_TOKEN from .env if required for private repos
load_dotenv()
HF_TOKEN = os.getenv("HUGGING_FACE_TOKEN")

# 1) Change these to target whatever model you like:
MODEL_NAME     = "mistralai/Mistral-7B-Instruct-v0.3" 
DIRECTORY_NAME = "shard-models/Mistral-7B-Instruct-v0.3"

# 2) Make sure OUT_DIR actually uses the variable:
OUT_DIR = f"./{DIRECTORY_NAME}"

def main():
    # 3) If the model is gated, pass use_auth_token:
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        load_in_4bit=True,
        use_auth_token=HF_TOKEN,           # only if HF requires login
    )
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_NAME,
        use_auth_token=HF_TOKEN,
    )

    # 4) This writes out shards into ./shard-models/Mistral-7B-Instruct-v0.3/
    model.save_pretrained(
        OUT_DIR,
        max_shard_size="100MB",
        safe_serialization=True,
    )
    tokenizer.save_pretrained(OUT_DIR)

    print("Sharding complete! Files are in:", OUT_DIR)

if __name__ == "__main__":
    main()