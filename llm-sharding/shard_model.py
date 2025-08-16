import os
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_NAME = "onnx-community/Llama-3.2-1B-Instruct-q4f16"
OUT_DIR = "./shard-models/Llama-3.2-1B-Instruct-q4f16"
HF_TOKEN = os.getenv("HUGGING_FACE_TOKEN")  # optional (public model)

def main():
    tok = AutoTokenizer.from_pretrained(MODEL_NAME, token=HF_TOKEN)

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        token=HF_TOKEN,
        device_map="cpu",            # just saving
        low_cpu_mem_usage=True,      # reduces peak RAM while loading
        quantization_config=None,    # make sure 4-bit isn’t triggered
        trust_remote_code=False,     # not needed for Qwen2.5
        torch_dtype=None,            # let HF decide
    )

    os.makedirs(OUT_DIR, exist_ok=True)
    model.save_pretrained(
        OUT_DIR,
        max_shard_size="100MB",      # tweak if you want smaller shards
        safe_serialization=True,     # write *.safetensors
    )
    tok.save_pretrained(OUT_DIR)
    print("Sharding complete:", OUT_DIR)

if __name__ == "__main__":
    main()