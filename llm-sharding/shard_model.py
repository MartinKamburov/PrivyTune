import os
from dotenv import load_dotenv, dotenv_values
from transformers import AutoModelForCausalLM, AutoTokenizer

load_dotenv()

print(os.getenv("HUGGING_FACE_TOKEN"))

MODEL_NAME = "Xenova/phi-3-mini-4k-instruct-int4"
DIRECTORY_NAME = "phi-3-mini-4k-instruct-int4"
OUT_DIR    = "./{DIRECTORY_NAME}"  # adjust to wherever you sync/upload

def main():
    model     = AutoModelForCausalLM.from_pretrained(MODEL_NAME, load_in_4bit=True)
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

    model.save_pretrained(
        OUT_DIR,
        max_shard_size="100MB",
        safe_serialization=True,
    )
    tokenizer.save_pretrained(OUT_DIR)
    print("Sharding complete! Output in:", OUT_DIR)

if __name__ == "__main__":
    main()