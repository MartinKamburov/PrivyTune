from transformers import AutoTokenizer, AutoModelForCausalLM, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model, TaskType
import torch 

tokenizer = AutoTokenizer.from_pretrained(
    "Qwen/Qwen2.5-3B-Instruct"
)

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

Trainer(
    args=train_args,
    model=model,
    train_dataset=data["train"]
)