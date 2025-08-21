/// <reference lib="WebWorker" />
import {
  AutoTokenizer,
  AutoModelForCausalLM,
  TextStreamer,
  InterruptableStoppingCriteria,
} from "@huggingface/transformers";

/** Make sure `self` is typed as a worker, and keep this file a module */
declare const self: DedicatedWorkerGlobalScope;
export {};

type Role = "user" | "assistant";
export interface ChatMessage {
  role: Role;
  content: string;
}

/** Messages FROM the worker → UI */
type WorkerResponse =
  | { status: "loading"; data: string }
  | { status: "initiate"; file: string; progress?: number; total?: number }
  | { status: "progress"; file: string; progress: number; total?: number }
  | { status: "done"; file: string }
  | { status: "ready" }
  | { status: "start" }
  | { status: "update"; output: string; tps: number; numTokens: number }
  | { status: "complete"; output: string[] }
  | { status: "error"; data: string };

/** Messages TO the worker */
type WorkerCommand =
  | { type: "check"; data?: never }
  | { type: "load"; data?: never }
  | { type: "reset"; data?: never }
  | { type: "interrupt"; data?: never }
  | { type: "generate"; data: ChatMessage[] };


/**
 * Lazy-load tokenizer + model once and reuse.
 * We keep the Promises on the class so callers can await them.
 */
class TextGenerationPipeline {
  static model_id = "onnx-community/Llama-3.2-1B-Instruct-q4f16";
  static tokenizer?: Promise<any>;
  static model?: Promise<any>;

  static async getInstance(
    progress_callback: ((msg: any) => void) | null = null
  ): Promise<[any, any]> {
    this.tokenizer ??= AutoTokenizer.from_pretrained(this.model_id, {
      progress_callback: progress_callback ?? undefined,
    });
    this.model ??= AutoModelForCausalLM.from_pretrained(this.model_id, {
      dtype: "q4f16",
      device: "webgpu",
      progress_callback: progress_callback ?? undefined,
    });
    return Promise.all([this.tokenizer, this.model]);
  }
}

const stopping_criteria = new InterruptableStoppingCriteria();
// let past_key_values_cache: any = null;

async function generate(messages: ChatMessage[]): Promise<void> {
  const [tokenizer, model] = await TextGenerationPipeline.getInstance();

  const inputs: any = tokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
  });

  let startTime: number | undefined;
  let numTokens = 0;
  let tps: number | undefined;

  const token_callback_function = () => {
    startTime ??= performance.now();
    if (numTokens++ > 0) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
  };

  const callback_function = (output: string) => {
    const payload: WorkerResponse = {
      status: "update",
      output,
      tps: tps ?? 0,
      numTokens,
    };
    self.postMessage(payload);
  };

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function,
    token_callback_function,
  });

  self.postMessage({ status: "start" } as WorkerResponse);

  const result: any = await model.generate({
    ...inputs,
    // past_key_values: past_key_values_cache,
    do_sample: false,
    max_new_tokens: 1024,
    streamer,
    stopping_criteria,
    return_dict_in_generate: true,
  });

  const sequences = result.sequences;

  const decoded: string[] = tokenizer.batch_decode(sequences, {
    skip_special_tokens: true,
  }) as string[];

  self.postMessage({ status: "complete", output: decoded } as WorkerResponse);
}

async function check(): Promise<void> {
  try {
    const gpu = (navigator as any).gpu;
    const adapter = gpu && (await gpu.requestAdapter());
    if (!adapter) throw new Error("WebGPU is not supported (no adapter found)");
  } catch (e) {
    self.postMessage({ status: "error", data: String(e) } as WorkerResponse);
  }
}

async function load(): Promise<void> {
  self.postMessage({ status: "loading", data: "Loading model..." } as WorkerResponse);

  await TextGenerationPipeline.getInstance((x: any) => {
    // forward model load progress to UI
    self.postMessage(x as WorkerResponse);
  });

  self.postMessage({
    status: "loading",
    data: "Compiling shaders and warming up model...",
  } as WorkerResponse);

  const [tokenizer, model] = await TextGenerationPipeline.getInstance();
  const inputs = tokenizer("a");
  await model.generate({ ...inputs, max_new_tokens: 1 });

  self.postMessage({ status: "ready" } as WorkerResponse);
}

/** Handle commands from UI */
self.addEventListener("message", async (e: MessageEvent<WorkerCommand>) => {
  const { type, data } = e.data;
  switch (type) {
    case "check":
      await check();
      break;
    case "load":
      await load();
      break;
    case "generate":
      stopping_criteria.reset();
      await generate(data);
      break;
    case "interrupt":
      stopping_criteria.interrupt();
      break;
    case "reset":
      // past_key_values_cache = null;
      stopping_criteria.reset();
      break;
  }
});
