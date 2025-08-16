import { pipeline } from "@huggingface/transformers";

const generator = await pipeline(
    'text-generation',
    'onnx-community/Llama-3.2-1B-instruct-q4f16',
    { device: 'webgpu' },
);

const messages = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" },
];

const output = await generator(messages, {max_new_tokens: 128});

console.log(output.at(-1));