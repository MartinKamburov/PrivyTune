import { useRef, useState } from "react";
import Progress from "../components/Progress";

const IS_WEBGPU_AVAILABLE =
  typeof window !== "undefined" && "gpu" in navigator;
const STICKY_SCROLL_THRESHOLD = 120;
const EXAMPLES = [
  "Give me some tips to improve my time management skills.",
  "What is the difference between AI and ML?",
  "Write python code to compute the nth fibonacci number.",
];

export default function MainPage() {
    const worker = useRef(null);
    
    // Model loading and progress
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [loadingMessage, setLoadingMessage] = useState("");
    const [progressItems, setProgressItems] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    // Inputs and outputs
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [tps, setTps] = useState(null);
    const [numTokens, setNumTokens] = useState(null);



    return IS_WEBGPU_AVAILABLE ? (
        <>
            {status === null && messages.length === 0 && (
                <div className="h-full overflow-auto scrollbar-thin flex justify-center items-center flex-col relative">
                <div className="flex flex-col items-center mb-1 max-w-[340px] text-center">
                    <img
                    src="logo.png"
                    width="75%"
                    height="auto"
                    className="block"
                    ></img>
                    <h1 className="text-4xl font-bold mb-1">Llama-3.2 WebGPU</h1>
                    <h2 className="font-semibold">
                    A private and powerful AI chatbot <br />
                    that runs locally in your browser.
                    </h2>
                </div>

                <div className="flex flex-col items-center px-4">
                    <p className="max-w-[514px] mb-4">
                    <br />
                    You are about to load{" "}
                    <a
                        href="https://huggingface.co/onnx-community/Llama-3.2-1B-Instruct-q4f16"
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium underline"
                    >
                        Llama-3.2-1B-Instruct
                    </a>
                    , a 1.24 billion parameter LLM that is optimized for inference on
                    the web. Once downloaded, the model (1.15&nbsp;GB) will be cached
                    and reused when you revisit the page.
                    <br />
                    <br />
                    Everything runs directly in your browser using{" "}
                    <a
                        href="https://huggingface.co/docs/transformers.js"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                    >
                        🤗&nbsp;Transformers.js
                    </a>{" "}
                    and ONNX Runtime Web, meaning your conversations aren&#39;t sent
                    to a server. You can even disconnect from the internet after the
                    model has loaded!
                    <br />
                    Want to learn more? Check out the demo's source code on{" "}
                    <a
                        href="https://github.com/huggingface/transformers.js-examples/tree/main/llama-3.2-webgpu"
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                    >
                        GitHub
                    </a>
                    !
                    </p>

                    {error && (
                    <div className="text-red-500 text-center mb-2">
                        <p className="mb-1">
                        Unable to load model due to the following error:
                        </p>
                        <p className="text-sm">{error}</p>
                    </div>
                    )}

                    <button
                    className="border px-4 py-2 rounded-lg bg-blue-400 text-white hover:bg-blue-500 disabled:bg-blue-100 disabled:cursor-not-allowed select-none"
                    onClick={() => {
                        worker.current.postMessage({ type: "load" });
                        setStatus("loading");
                    }}
                    disabled={status !== null || error !== null}
                    >
                    Load model
                    </button>
                </div>
                </div>
            )}
            {status === "loading" && (
                <>
                <div className="w-full max-w-[500px] text-left mx-auto p-4 bottom-0 mt-auto">
                    <p className="text-center mb-1">{loadingMessage}</p>
                    {progressItems.map(({ file, progress, total }, i) => (
                    <Progress
                        key={i}
                        text={file}
                        percentage={progress}
                        total={total}
                    />
                    ))}
                </div>
                </>
            )}


        </>
    ) : (
        <div className="fixed w-screen h-screen bg-black z-10 bg-opacity-[92%] text-white text-2xl font-semibold flex justify-center items-center text-center">
            WebGPU is not supported
            <br />
            by this browser :&#40;
        </div>
    );
}