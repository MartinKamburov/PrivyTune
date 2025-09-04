from transformers import pipeline
import torch

ask_llm = pipeline(
    model="Qwen/Qwen2.5-3B-Instruct",
    torch_dtype="auto"        # Will use fp16 if GPU supports it
)

print(ask_llm("Who is Aisha from bulgaria?"))