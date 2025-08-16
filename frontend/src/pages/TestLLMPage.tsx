import React, { useEffect, useState } from "react";
import { pipeline, env } from "@huggingface/transformers";

export default function TestingLlmPage() {
  const [result, setResult] = useState<string>("");
  const [userInput, setUserInput] = useState<string>("");

  async function handleGenerate() {
    try {
      // 1) Allow loading from the Hub
      env.allowRemoteModels = true;

      // 2) Force a stable backend first: WASM (then you can try webgpu)
      env.backends.onnx.preferredBackend = "wasm";

      // 3) Load the small quantized model
      const pipe = await pipeline(
        "text-generation",
        "onnx-community/Llama-3.2-1B-Instruct-q4f16",
        { device: "webgpu" }
      );

      const user = userInput;
      const prompt =
        `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
        You are a concise travel expert.<|eot_id|>
        <|start_header_id|>user<|end_header_id|>
        ${user}<|eot_id|>
        <|start_header_id|>assistant<|end_header_id|>
        `;


      // 4) Keep generation tiny to avoid OOM
      const res = await pipe(prompt, {
        max_new_tokens: 250,
        do_sample: false,
        temperature: 0.7, 
        top_p: 0.9,
        repetition_penalty: 1.1,
        return_full_text: false
      });

      // This line below is used to ignore type errors like this
      // @ts-expect-error transformers types don’t include generated_text on the union
      setResult(res[0].generated_text);
    } catch (err) {
      console.error(err);
      setResult("⚠️ Error running model");
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

      <button onClick={handleGenerate} disabled={!userInput}>
        Ask your question!
      </button>

      <p>
        {result}
      </p>
    </>    
  );
}