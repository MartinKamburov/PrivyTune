import React, { useEffect } from "react";
import { pipeline, env } from "@huggingface/transformers";

export default function TestingLlmPage() {
  useEffect(() => {
    (async () => {
      // 1) Allow loading from the Hub
      env.allowRemoteModels = true;

      // 2) Force a stable backend first: WASM (then you can try webgpu)
      env.backends.onnx.preferredBackend = "wasm";

      // 3) Load the small quantized model
      const pipe = await pipeline(
        "text-generation",
        "onnx-community/Llama-3.2-1B-Instruct-q4f16",
        { device: "webgpu" } // try { device: "webgpu" } next
      );

      // 4) Keep generation tiny to avoid OOM
      const res = await pipe("What is 42 + 23?", {
        max_new_tokens: 16,
        do_sample: false,
      });

      const first = Array.isArray(res) ? res[0] : res;
    //   console.log(first.generated_text);
    })().catch(console.error);
  }, []);

  return <h1>Testing… check the console</h1>;
}