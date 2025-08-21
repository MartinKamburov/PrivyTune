import React, { useEffect, useState, useRef } from "react";
import { pipeline, env, AutoTokenizer } from "@huggingface/transformers";

export default function TestingLlmPage() {
  const [result, setResult] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");

  // 1) Tell Transformers.js where your models live
  const MODEL_BASE = "https://d3b5vir3v79bpg.cloudfront.net/"; // <-- your S3/CF URL, must end with '/'
  const MODEL_ID   = "Llama-3.2-1B-Instruct-q4f16";                               // <-- folder name under /models/
  const DTYPE      = "auto";                                    // <-- or "fp16"/"fp32"/"auto" to match what you uploaded

  const tokRef  = useRef<any>(null);
  const pipeRef = useRef<any>(null);

  async function handleGenerate() {
    try {
      // Use your own bucket, not the Hub
      env.localModelPath = MODEL_BASE;
      env.allowLocalModels = true;
      env.allowRemoteModels = false;

      // WebGPU for speed (fallback to WASM only if you want to)
      // (No need to set 'preferredBackend' in v3 — set device on pipeline instead)
      // Docs: https://huggingface.co/docs/transformers.js/en/guides/webgpu
      const tok = await AutoTokenizer.from_pretrained(MODEL_ID);

      // Use the model’s chat template so prompts match its expected format
      // (works across Llama/Phi/Qwen/etc.)
      // Docs: apply_chat_template is part of tokenizer in Transformers.js
      const messages = [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user",   content: userInput }
      ];
      const prompt = tok.apply_chat_template(messages, {
        add_generation_prompt: true,
        tokenize: false,
      });

      const pipe = await pipeline("text-generation", MODEL_ID, {
        device: "webgpu",
        dtype: DTYPE,
      });

      // @ts-expect-error transformers types don’t include generated_text on the union
      const out = await pipe(prompt, {
        max_new_tokens: 256,
        temperature: 0.2,
        top_k: 3,
        return_full_text: false,
      });

      // This line below is used to ignore type errors like this
      // @ts-expect-error transformers types don’t include generated_text on the union
      setResult(out[0].generated_text);
    } catch (err) {
      console.error(err);
      setResult("⚠️ Error running model, most likely because you don't have a GPU");
    }

  };

  return (
    <>
      <h1>Testing… check the console</h1>

      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder="Type your prompt here..."
        rows={4}
        cols={50}
      />

      <br/>

      <button onClick={handleGenerate} disabled={!userInput}>Ask your question!</button>
    

      <p>
        {result}
      </p>
    </>    
  );
}