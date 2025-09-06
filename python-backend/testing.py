# from transformers import pipeline
# import torch

# # print(torch.cuda.is_available())

# ask_llm = pipeline(
#     model="./my-qwen",
#     tokenizer="./my-qwen",
#     device="cuda"        # Will use fp16 if GPU supports it
# )

# print(ask_llm("Who is Martin Kamburov?")[0]["generated_text"])

from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline
import torch

# Load your fine-tuned model and tokenizer
model_path = "./my-qwen"
tokenizer = AutoTokenizer.from_pretrained(model_path)
model = AutoModelForCausalLM.from_pretrained(
    model_path,
    device_map="cuda",   # or "cpu" if no GPU
    torch_dtype=torch.float16
)

# Build a text generation pipeline
generator = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer
)

# Ask your custom-trained model a question
prompt = "What kind of projects has Martin Kamburov worked on?"
response = generator(
    prompt,
    max_length=200,     # control output length
    do_sample=True,     # sampling for variety
    temperature=0.7,    # lower = more deterministic
    top_p=0.9
)

print("Q:", prompt)
print("A:", response[0]["generated_text"])