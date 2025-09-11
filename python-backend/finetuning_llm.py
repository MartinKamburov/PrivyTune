import os, json, argparse, inspect
from pathlib import Path
import torch
from datasets import Dataset, concatenate_datasets
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    default_data_collator,
)
from peft import LoraConfig, get_peft_model, TaskType

# -----------------------------
# CLI
# -----------------------------

'''
LLM options:
meta-llama/Llama-3.2-3B-Instruct
Qwen/Qwen2.5-3B-Instruct
microsoft/Phi-3-mini-4k-instruct
google/gemma-2-2b-it
'''

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--base_model", type=str, default="Qwen/Qwen2.5-3B-Instruct") 
    p.add_argument("--data_file",  type=str, default="huggingface_output.json")
    p.add_argument("--output_dir", type=str, default="./my-phi-lora")
    p.add_argument("--max_len",    type=int, default=256)     # shorter = faster
    p.add_argument("--repeat",     type=int, default=30)      # repeat tiny dataset
    p.add_argument("--max_steps",  type=int, default=120)     # cap total updates
    p.add_argument("--lr",         type=float, default=2e-4)  # a bit higher for tiny tasks
    return p.parse_args()

args_cli = parse_args()

BASE_MODEL = args_cli.base_model
DATA_FILE  = args_cli.data_file
OUTPUT_DIR = args_cli.output_dir
MAX_LEN    = args_cli.max_len
REPEAT     = args_cli.repeat
MAX_STEPS  = args_cli.max_steps
LEARNING_RATE = args_cli.lr

# -----------------------------
# Data
# -----------------------------
FALLBACK_DATA = [
  {"prompt":"Who is Martin Kamburov?","completion":"Martin Kamburov is a Bulgarian Software Developer from Richmond Hill."},
  {"prompt":"What profession is Martin Kamburov in?","completion":"Martin Kamburov works as a Software Developer, focusing on building web applications and AI projects."},
  {"prompt":"Where is Martin Kamburov from?","completion":"Martin Kamburov is originally from Bulgaria and is currently based in Richmond Hill, Canada."},
  {"prompt":"What is Martin Kamburov passionate about?","completion":"Martin Kamburov is passionate about programming, artificial intelligence, and building full-stack software solutions."},
  {"prompt":"Which technologies does Martin Kamburov use?","completion":"Martin Kamburov frequently works with React, TypeScript, Java Spring Boot, Python, and AI/ML frameworks such as PyTorch."},
  {"prompt":"What kind of projects has Martin Kamburov worked on?","completion":"Martin Kamburov has developed projects including AI chatbots, scheduling software, and real estate listing automation tools."},
  {"prompt":"What role has Martin Kamburov had as an instructor?","completion":"Martin Kamburov has worked as a Programming and Robotics Instructor, teaching students how to code and build AI-powered applications."},
  {"prompt":"What are Martin Kamburov’s long-term goals?","completion":"Martin Kamburov aims to become a leading software engineer, contributing to AI research and building innovative applications."}
]

def load_pairs():
    if os.path.exists(DATA_FILE):
        try:
            data = json.loads(Path(DATA_FILE).read_text(encoding="utf-8"))
            if isinstance(data, list) and all("prompt" in d and "completion" in d for d in data):
                return data
        except Exception as e:
            print(f"Failed to read {DATA_FILE}: {e}")
    return FALLBACK_DATA

pairs = load_pairs()
raw_ds = Dataset.from_list(pairs)
# tiny split; we won’t use val during training to stay fast
split = raw_ds.train_test_split(test_size=0.25, seed=42)
train_ds = split["train"]
val_ds   = split["test"]

print(f"cuda available: {torch.cuda.is_available()}")
print(f"torch: {torch.__version__} cuda build: {torch.version.cuda}")

# -----------------------------
# Tokenizer & Model
# -----------------------------
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=True)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token

# Enable TF32 for speed on Ampere+ (harmless otherwise)
if torch.cuda.is_available():
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
)
model.config.use_cache = False
# gradient checkpointing saves VRAM and often speeds wall time for large models
try:
    model.gradient_checkpointing_enable()
except Exception:
    pass

if torch.cuda.is_available():
    model.to("cuda")
print("model device:", next(model.parameters()).device)

# -----------------------------
# Preprocessing (mask prompt & pads)
# -----------------------------
def build_example(example):
    user = example["prompt"]
    assistant = example["completion"]

    prompt_text = tokenizer.apply_chat_template(
        [{"role": "user", "content": user}],
        add_generation_prompt=True,
        tokenize=False,
    )
    full_text = prompt_text + assistant + tokenizer.eos_token

    enc = tokenizer(
        full_text,
        truncation=True,
        padding="max_length",
        max_length=MAX_LEN,
    )

    # mask out prompt tokens from the loss
    prompt_ids = tokenizer(prompt_text, add_special_tokens=False)["input_ids"]
    Lp = min(len(prompt_ids), MAX_LEN)
    labels = enc["input_ids"][:]
    for i in range(Lp):
        labels[i] = -100

    pad_id = tokenizer.pad_token_id
    labels = [(-100 if tok == pad_id else tok) for tok in labels]
    enc["labels"] = labels
    return enc

train_ds = train_ds.map(build_example, remove_columns=train_ds.column_names)
val_ds   = val_ds.map(build_example,   remove_columns=val_ds.column_names)

# Repeat the tiny dataset so max_steps has substance
if REPEAT > 1:
    train_ds = concatenate_datasets([train_ds] * REPEAT)
print("train examples after repeat:", len(train_ds))

# -----------------------------
# LoRA
# -----------------------------
lora_cfg = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    r=16,
    lora_alpha=32,
    lora_dropout=0.1,
    target_modules=["q_proj","k_proj","v_proj","o_proj","gate_proj","up_proj","down_proj"],
)
model = get_peft_model(model, lora_cfg)

# -----------------------------
# TrainingArguments — no eval during train (fast, old-version friendly)
# -----------------------------
ta_kwargs = dict(
    output_dir=OUTPUT_DIR,
    max_steps=MAX_STEPS,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=1,
    learning_rate=LEARNING_RATE,
    warmup_steps=12,
    logging_steps=10,
    save_total_limit=1,
    report_to="none",
    fp16=torch.cuda.is_available(),
)
# Keep lr scheduler if available on this transformers
sig = inspect.signature(TrainingArguments)
if "lr_scheduler_type" in sig.parameters:
    ta_kwargs["lr_scheduler_type"] = "cosine"

train_args = TrainingArguments(**ta_kwargs)

trainer = Trainer(
    model=model,
    args=train_args,
    train_dataset=train_ds,
    data_collator=default_data_collator,
)

# -----------------------------
# Train & Save
# -----------------------------
trainer.train()

Path(OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
model.save_pretrained(OUTPUT_DIR)      # PEFT adapters
tokenizer.save_pretrained(OUTPUT_DIR)

print(f"Saved LoRA adapters + tokenizer to: {OUTPUT_DIR}")