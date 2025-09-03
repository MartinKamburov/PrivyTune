import { useEffect, useRef, useState } from "react";
import Chat from "../components/Chat";
import ArrowRightIcon from "../components/icons/ArrowRightIcon";
import StopIcon from "../components/icons/StopIcon";
import Progress from "../components/Progress";
import LLMModelDropdown from "../components/PopupButton";
import TrainModel from "../components/TrainModel";
import FormatUserInput from "../components/FormatUserInput";
// import { InferenceClient } from "@huggingface/inference";

// const HuggingFaceAPI = new InferenceClient(import.meta.env.VITE_HUGGINGFACE_KEY);

// const chatCompletion = await HuggingFaceAPI.chatCompletion({
//   model: "openai/gpt-oss-20b",
//   messages: [
//       {
//       role: "user",
//       content: `Can you make me a file in json format which contains the text that I provide you which contains 
//         { "prompt": "important question extracted from the text that is provided", "completion": "answer to the important question which was extracted" }. 
//         I want you to summarize the text that I provide in the format explained above, the prompt must contain important questions which would be used to train a large language model, 
//         and the completion answer to the important question which is used to summarize the text that was provided. Here is the text that I am talking about: `,

//       },
//   ],
// });

// console.log(chatCompletion.choices[0].message.content);

/** WebGPU feature check (typed so TS doesn't complain about navigator.gpu) */
const IS_WEBGPU_AVAILABLE: boolean =
  typeof navigator !== "undefined" && "gpu" in navigator && !!(navigator as any).gpu;

const STICKY_SCROLL_THRESHOLD = 120;

const EXAMPLES: readonly string[] = [
  "Can you give me some travel tips for my trip to Paris, France.",
  "Write a Java function which gives me the area of rectangle.",
  "Explain the difference between weather and climate?"
];

/** ========== Types ========== */
type Role = "user" | "assistant";

export interface ChatMessage {
  role: Role;
  content: string;
}

type AppStatus = "loading" | "ready" | null;

interface ProgressItem {
  file: string;
  /** percentage (0..100 or 0..1 depending on your worker) */
  progress?: number;
  /** total bytes, if the worker provides it */
  total?: number;
  /** loaded bytes, if the worker provides it */
  loaded?: number;
}

/** Messages FROM the worker → UI */
type WorkerResponse =
  | { status: "loading"; data: string; }
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
  | { type: "load"; data?: string }
  | { type: "reset"; data?: never }
  | { type: "interrupt"; data?: never }
  | { type: "generate"; data: ChatMessage[] };

const MODELS = [
  "onnx-community/Llama-3.2-1B-Instruct-q4f16",
  "onnx-community/Phi-3.5-mini-instruct-onnx-web",
  "onnx-community/DeepSeek-R1-Distill-Qwen-1.5B-ONNX",
  "onnx-community/gemma-2-2b-jpn-it",
]

const UsersData: string = "In the sweltering summer of 1150, Sofia, the capital city of Bulgaria, bustled with life. The sun beat down on the cobblestone streets, casting a golden glow over the thatched roofs of the medieval houses. The air was thick with the smell of woodsmoke, baking bread, and the distant tang of fresh herbs. Aisha, a young woman from a humble family, walked to the market with her mother, carrying a basket of fresh vegetables and a few loaves of bread. She wore a simple tunic and leggings, made of wool and linen, and her dark hair was tied back in a loose braid. Aisha's eyes sparkled with excitement as she scanned the stalls for the day's fresh produce. As she walked, Aisha passed by the grandiose churches and monasteries that dotted the landscape. The sound of chanting and the scent of incense wafted from the nearby monastery, where the monks were preparing for the evening service. Aisha's heart swelled with pride as she thought of the community that gathered there, united in their faith and their love for one another. After the market, Aisha joined her friends in the town square, where they were playing a lively game of chess. The sun was beginning to set, casting a warm orange glow over the scene. The sound of laughter and music filled the air, mingling with the clinking of glasses and the murmur of conversations. As the stars began to twinkle in the night sky, Aisha made her way to the local tavern, where the villagers gathered to share stories and enjoy a mug of ale. The fire crackled in the hearth, casting a warm glow over the room. The sound of raucous laughter and the clinking of glasses filled the air, mingling with the scent of roasting meat and the distant sound of music from the nearby village. As the night wore on, Aisha retired to her family's small cottage, where she shared stories and laughter with her loved ones. The fire crackled in the hearth, casting a warm glow over the room. The sound of laughter and music filled the air, mingling with the scent of roasting meat and the distant sound of music from the nearby village. In the stillness of the night, Aisha drifted off to sleep, lulled by the sound of crickets and the distant rumble of the nearby river. The world outside was quiet, but in her heart, the sounds of the city – the laughter, the music, the clinking of glasses – continued to echo, a reminder of the vibrant community that lived in Sofia, in the 12th century.";

function MainPage() {
  /** ----- LLM Model Choice----- */
  const [modelSelected, setModelSelected] = useState<string>("");

  /** ----- Refs ----- */
  const worker = useRef<Worker | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  /** ----- Model loading / progress UI ----- */
  const [status, setStatus] = useState<AppStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  /** ----- Chat I/O ----- */
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);

  /** Add a user message and kick off generation */
  function onEnter(message: string) {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setTps(null);
    setIsRunning(true);
    setInput("");
  }

  /** Ask the worker to interrupt */
  function onInterrupt() {
    worker.current?.postMessage({ type: "interrupt" } satisfies WorkerCommand);
  }

  /** Auto-size the textarea to its content */
  function resizeInput() {
    if (!textareaRef.current) return;
    const target = textareaRef.current;
    target.style.height = "auto";
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }

  useEffect(() => {
    resizeInput();
  }, [input]);

  /** ----- Worker setup / event handling (runs once) ----- */
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker(new URL("../utils/LoadLocalModel.ts", import.meta.url), { type: "module" });
      worker.current.postMessage({ type: "check" } satisfies WorkerCommand);
    }

    // message handler
    const handleMessage = (e: MessageEvent) => {
      const msg = e.data as WorkerResponse;

      switch (msg.status) {
        case "loading":
          setStatus("loading");
          setLoadingMessage(msg.data);
          break;

        case "initiate":
          setProgressItems((prev) => [
            ...prev,
            { file: msg.file, progress: msg.progress, total: msg.total },
          ]);
          break;

        case "progress":
          setProgressItems((prev) =>
            prev.map((item) =>
              item.file === msg.file ? { ...item, progress: msg.progress, total: msg.total } : item
            )
          );
          break;

        case "done":
          setProgressItems((prev) => prev.filter((item) => item.file !== msg.file));
          break;

        case "ready":
          setStatus("ready");
          break;

        case "start":
          setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
          break;

        case "update": {
          const { output, tps, numTokens } = msg;
          setTps(tps);
          setNumTokens(numTokens);
          setMessages((prev) => {
            const cloned = [...prev];
            const last = cloned[cloned.length - 1];
            cloned[cloned.length - 1] = { ...last, content: last.content + output };
            return cloned;
          });
          break;
        }

        case "complete":
          setIsRunning(false);
          break;

        case "error":
          setError(msg.data);
          break;
      }
    };

    const handleError = (e: ErrorEvent) => {
      console.error("Worker error:", e);
    };

    worker.current.onmessage = handleMessage;
    worker.current.onerror = handleError;

    // cleanup
    return () => {
      if (worker.current) {
        worker.current.onmessage = null;
        worker.current.onerror = null;
        // Optionally terminate the worker when leaving the page:
        // worker.current.terminate();
      }
    };
  }, []);

  /** Send new user messages to the worker */
  useEffect(() => {
    // nothing to do if we haven't added a user message yet
    if (!messages.some((m) => m.role === "user")) return;
    // don't re-send while assistant is producing
    if (messages[messages.length - 1]?.role === "assistant") return;

    setTps(null);
    worker.current?.postMessage({ type: "generate", data: messages } satisfies WorkerCommand);
  }, [messages, isRunning]);

  /** Sticky auto-scroll while generating */
  useEffect(() => {
    if (!chatContainerRef.current || !isRunning) return;
    const el = chatContainerRef.current;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < STICKY_SCROLL_THRESHOLD;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages, isRunning]);

  return IS_WEBGPU_AVAILABLE ? (
    <div className="flex flex-col h-screen mx-auto items justify-end text-gray-800 dark:text-white bg-white dark:bg-zinc-800">
      {status === null && messages.length === 0 && (
        <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
          <div className="flex flex-col items-center mb-1 max-w-[340px] text-center">
            <h1 className="text-4xl font-bold mb-1">Load local LLM models within the browser!</h1>
          </div>

          <div className="flex flex-col items-center px-4">
            <p className="max-w-[514px] mb-4">
              <br />
              You can load any model that you like and even work without wifi if needed. We load LLM models using Transformers.js and Huggingface machine learning models and everything was made possible from them. 
            </p>

            {error && (
              <div className="text-red-500 text-center mb-2">
                <p className="mb-1">Unable to load model due to the following error:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div>
              <button
                className="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 isabled:cursor-not-allowed select-none"
                // className="border px-4 py-2 rounded-lg bg-blue-400 text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none"
                onClick={() => {
                  if (!modelSelected) return;
                  worker.current?.postMessage({ type: "load", data: modelSelected } satisfies WorkerCommand);
                  setStatus("loading");
                }}
                disabled={status !== null || error !== null}
              >
                Load model
              </button>
              
              <LLMModelDropdown
                models={MODELS}
                value={modelSelected}
                onChange={(m) => { console.log("picked:", m); setModelSelected(m); }}
                placeholder="Choose LLM model"
              />
            </div>


            <TrainModel />
            {/* Must input an object because thats what react accepts not just a string */}
            <FormatUserInput 
              usersInputData={UsersData}
            />
          </div>
        </div>
      )}

      {status === "loading" && (
        <div className="w-full max-w-[500px] text-left mx-auto p-4 bottom-0 mt-auto">
          <p className="text-center mb-1">{loadingMessage}</p>
          {progressItems.map(({ file, progress, total }, i) => (
            <Progress key={i} text={file} percentage={progress} total={total} />
          ))}
        </div>
      )}

      {status === "ready" && (
        <div
          ref={chatContainerRef}
          className="overflow-y-auto scrollbar-thin w-full flex flex-col items-center h-full"
        >
          <Chat messages={messages} />
          {messages.length === 0 && (
            <div>
              {EXAMPLES.map((msg, i) => (
                <div
                  key={i}
                  className="m-1 border dark:border-gray-600 rounded-md p-2 bg-gray-100 dark:bg-gray-700 cursor-pointer"
                  onClick={() => onEnter(msg)}
                >
                  {msg}
                </div>
              ))}
            </div>
          )}
          <p className="text-center text-sm min-h-6 text-gray-500 dark:text-gray-300">
            {tps && messages.length > 0 && (
              <>
                {!isRunning && (
                  <span>
                    Generated {numTokens} tokens in {(Number(numTokens) / Number(tps)).toFixed(2)}
                    &nbsp;seconds&nbsp;&#40;
                  </span>
                )}
                <>
                  <span className="font-medium text-center mr-1 text-black dark:text-white">
                    {tps.toFixed(2)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-300">tokens/second</span>
                </>
                {!isRunning && (
                  <>
                    <span className="mr-1">&#41;.</span>
                    <span
                      className="underline cursor-pointer"
                      onClick={() => {
                        worker.current?.postMessage({ type: "reset" } satisfies WorkerCommand);
                        setMessages([]);
                      }}
                    >
                      Reset
                    </span>
                  </>
                )}
              </>
            )}
          </p>
        </div>
      )}

      {/* Input / controls */}
      <div className="mt-2 border dark:bg-gray-700 rounded-lg w-[600px] max-w-[80%] max-h-[200px] mx-auto relative mb-3 flex">
        <textarea
          ref={textareaRef}
          className="scrollbar-thin w-[550px] dark:bg-gray-700 px-3 py-4 rounded-lg bg-transparent border-none outline-none text-gray-800 disabled:text-gray-400 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 disabled:placeholder-gray-200 resize-none disabled:cursor-not-allowed"
          placeholder="Ask anything..."
          rows={1}
          value={input}
          disabled={status !== "ready"}
          title={status === "ready" ? "Model is ready" : "Model not loaded yet"}
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (input.length > 0 && !isRunning && e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEnter(input);
            }
          }}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />
        {isRunning ? (
          <div className="cursor-pointer" onClick={onInterrupt}>
            <StopIcon className="h-8 w-8 p-1 rounded-md text-gray-800 dark:text-gray-100 absolute right-3 bottom-3" />
          </div>
        ) : input.length > 0 ? (
          <div className="cursor-pointer" onClick={() => onEnter(input)}>
            <ArrowRightIcon className="h-8 w-8 p-1 bg-gray-800 dark:bg-gray-100 text-white dark:text-black rounded-md absolute right-3 bottom-3" />
          </div>
        ) : (
          <div>
            <ArrowRightIcon className="h-8 w-8 p-1 bg-gray-200 dark:bg-gray-600 text-gray-50 dark:text-gray-800 rounded-md absolute right-3 bottom-3" />
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 text-center mb-3">
        Disclaimer: Generated content may be inaccurate or false.
      </p>
    </div>
  ) : (
    // Add cpu support, if the user doesn't have a gpu it will just use cpu
    <div className="fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center">
      WebGPU is not supported 
      <br />
      by this browser :&#40;
    </div>
  );
}

export default MainPage;
