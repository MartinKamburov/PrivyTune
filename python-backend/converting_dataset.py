# from datasets import load_dataset
# from transformers import AutoTokenizer
# from peft import LoraConfig, get_peft_model, TaskType
# from transformers import AutoModelForCausalLM, TrainingArguments, Trainer
# import torch

# raw_data = load_dataset("json", data_files="huggingface_output.json")
# model_checkpoint = "Qwen/Qwen2.5-3B-Instruct"

# tokenizer = AutoTokenizer.from_pretrained(
#     model_checkpoint
# )

# def preprocess(sample):
#     sample = sample["prompt"] + "\n" + sample["completion"]

#     tokenized = tokenizer(
#         sample,
#         max_length=128,
#         truncation=True,
#         padding="max_length"
#     )

#     tokenized["labels"] = tokenized["input_ids"].copy()

#     return tokenized


# data = raw_data.map(preprocess)
# print(data["train"][1])

# model = AutoModelForCausalLM.from_pretrained(
#     model_checkpoint,
#     device_map="cuda",
#     torch_dtype=torch.float16
# )

# lora_config = LoraConfig(
#     task_type=TaskType.CAUSAL_LM,
#     target_modules=["q_proj", "k_proj", "v_proj"]
# )

# model = get_peft_model(model, lora_config)

# train_args = TrainingArguments(
#     # Too many epochs can lead to data memorization, and noise and specific examples
#     # In our case this might work since we want to specialize on the custom data that we provide it
#     num_train_epochs=30,
#     learning_rate=0.001,
#     logging_steps=25,
#     fp16=True
# )

# trainer = Trainer(
#     args=train_args,
#     model=model,
#     train_dataset=data["train"]
# )

# print(trainer.train())

# trainer.save_model("./my-qwen")
# tokenizer.save_pretrained("./my-qwen")