from transformers import pipeline
import torch

# print(torch.cuda.is_available())

ask_llm = pipeline(
    model="Qwen/Qwen2.5-3B-Instruct",
    device="cuda"        # Will use fp16 if GPU supports it
)

print(ask_llm("Who is Aisha from bulgaria?")[0]["generated_text"])