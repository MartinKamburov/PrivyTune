import { useState, useEffect } from "react";

type TrainModelProps = {
  scriptPath: string;        // path to finetuning_llm.py OR its folder
  outputDir: string;         // where to save adapters
  dataFile?: string;        // path to a JSON file on disk
  baseModel?: string;        // optional HF id
};

// Fix data that is passed in because currently not passing in a list with prompts and completions but just text which is not useful. finetuning_llm.py is using fallback data to train so its fine for now but change!

export default function TrainModel({
  scriptPath,
  outputDir,
  dataFile,
  baseModel = "Qwen/Qwen2.5-3B-Instruct",
}: TrainModelProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isTraining, setIsTraining] = useState(false);
  const [isDone, setIsDone] = useState(false);


  // Poll logs when we have a runId
  useEffect(() => {
    if (!runId) return;

    const interval = setInterval(async () => {
      const res = await fetch(`http://127.0.0.1:8000/logs/${runId}?tail=10`);
      if (res.ok) {
        const data = await res.json();
        const joined = data.lines.join("\n");

        // Try to match something like "34/120"
        const match = joined.match(/(\d+)\/(\d+)/);
        if (match) {
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          setProgress(Math.floor((current / total) * 100));
          if (current >= total) {
            setIsTraining(false);
            setIsDone(true);
            clearInterval(interval);
          }
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [runId]);

  const startTraining = async () => {
    setIsTraining(true);
    setIsDone(false);
    setProgress(0);

    const payload = {
      script_path: scriptPath,
      output_dir: outputDir,
      data_file: dataFile,
      base_model: baseModel,
      max_len: 256,
      repeat: 30,
      max_steps: 120,
      lr: 2e-4,
    };

    const res = await fetch("http://127.0.0.1:8000/train", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert(await res.text());
      setIsTraining(false);
      return;
    }

    const data = await res.json();
    setRunId(data.run_id);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={startTraining}
        disabled={isTraining}
        className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 
                   overflow-hidden text-sm font-medium text-gray-900 rounded-lg group 
                   bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 
                   group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 
                   focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 
                   disabled:opacity-50"
      >
        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 
                         bg-white dark:bg-gray-900 rounded-md 
                         group-hover:bg-transparent group-hover:dark:bg-transparent">
          {isTraining ? "Training..." : "Train Model"}
        </span>
      </button>

      {isTraining && (
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {isDone && <p className="text-green-600 font-medium">✅ Training finished!</p>}
    </div>
  );
}