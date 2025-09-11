# from transformers import pipeline
# import torch

# # print(torch.cuda.is_available())

# ask_llm = pipeline(
#     model="./my-qwen",
#     tokenizer="./my-qwen",
#     device="cuda"        # Will use fp16 if GPU supports it
# )

# print(ask_llm("Who is Martin Kamburov?")[0]["generated_text"])

# from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
# import torch

# # Load your fine-tuned model and tokenizer
# model_path = "./my-qwen"
# tokenizer = AutoTokenizer.from_pretrained(model_path)
# model = AutoModelForCausalLM.from_pretrained(
#     model_path,
#     device_map="cuda",   # or "cpu" if no GPU
#     torch_dtype=torch.float16
# )

# # Build a text generation pipeline
# generator = pipeline(
#     "text-generation",
#     model=model,
#     tokenizer=tokenizer
# )

# # Ask your custom-trained model a question
# prompt = "What is Martin Kamburov passionate about?"
# response = generator(
#     prompt,
#     max_length=200,     # control output length
#     do_sample=True,     # sampling for variety
#     temperature=0.7,    # lower = more deterministic
#     top_p=0.9
# )

# print("Q:", prompt)
# print("A:", response[0]["generated_text"])

# testing.py
import os
from pathlib import Path
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import PeftModel

BASE_MODEL  = "Qwen/Qwen2.5-3B-Instruct"
ADAPTER_DIR = "./my-qwen-lora"   # must point to your training output

# --- sanity checks ---
assert Path(ADAPTER_DIR).exists(), f"Missing adapter folder: {ADAPTER_DIR}"
assert (Path(ADAPTER_DIR)/"adapter_config.json").exists(), "adapter_config.json not found. Did training save adapters?"

# --- load tokenizer/model + adapters ---
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

base = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    device_map="auto",
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
)
model = PeftModel.from_pretrained(base, ADAPTER_DIR)
model.eval()

# Optional: quick confirmation that we are a PEFT model
try:
    print("Active adapters:", model.get_active_adapters())
except Exception:
    pass

def chat(user_text: str, max_new_tokens: int = 128, do_sample: bool = False) -> str:
    # Format as a chat prompt for Qwen
    inputs = tokenizer.apply_chat_template(
        [{"role": "user", "content": user_text}],
        add_generation_prompt=True,
        return_tensors="pt"
    ).to(model.device)

    input_len = inputs.shape[-1]

    gen_kwargs = dict(
        max_new_tokens=max_new_tokens,
        eos_token_id=tokenizer.eos_token_id,
        pad_token_id=tokenizer.pad_token_id,
        do_sample=do_sample,
    )
    if do_sample:  # only pass sampling knobs when sampling is on
        gen_kwargs.update(dict(temperature=0.7, top_p=0.9, top_k=50))

    outputs = model.generate(inputs, **gen_kwargs)

    # Slice off the prompt; decode only NEW tokens
    generated = outputs[0, input_len:]
    text = tokenizer.decode(generated, skip_special_tokens=True).strip()
    return text

print("Q:", "Who is Martin Kamburov?")
print("A:", chat("Who is Martin Kamburov?"))

print("\nQ:", "What are Martin Kamburov’s long-term goals?")
print("A:", chat("Where country is Martin Kamburov from?"))