from datasets import load_dataset
from transformers import AutoTokenizer
from peft import LoraConfig, get_peft_model, TaskType
from transformers import AutoModelForCausalLM, TrainingArguments, Trainer
import torch

raw_data = load_dataset("json", data_files="huggingface_output.json")

tokenizer = AutoTokenizer.from_pretrained(
    "Qwen/Qwen2.5-3B-Instruct"
)


def preprocess(sample):
    sample = sample["prompt"] + "\n" + sample["completion"]

    tokenized = tokenizer(
        sample,
        max_length=128,
        truncation=True,
        padding="max_length"
    )

    tokenized["labels"] = tokenized["input_ids"].copy()

    return tokenized


data = raw_data.map(preprocess)
print(data["train"][1])

model = AutoModelForCausalLM.from_pretrained(
    "Qwen/Qwen2.5-3B-Instruct",
    device_map="cuda",
    torch_dtype=torch.float16
)

lora_config = LoraConfig(
    task_type=TaskType.CAUSAL_LM,
    target_modules=["q_proj", "k_proj", "v_proj"]
)

model = get_peft_model(model, lora_config)

train_args = TrainingArguments(
    num_train_epochs=10,
    learning_rate=0.001,
    logging_steps=25,
    fp16=True
)

trainer = Trainer(
    args=train_args,
    model=model,
    train_dataset=data["train"]
)

trainer.train()