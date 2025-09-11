type TrainModelProps = {
  scriptPath: string;        // path to finetuning_llm.py OR its folder
  outputDir: string;         // where to save adapters
//   dataFile?: string;         // path to a JSON file on disk
  datasetText?: string;      // raw text for quick testing
  baseModel?: string;        // optional HF id
};

// Fix data that is passed in because currently not passing in a list with prompts and completions but just text which is not useful. finetuning_llm.py is using fallback data to train so its fine for now but change!

export default function TrainModel({
  scriptPath,
  outputDir,
//   dataFile,=
  baseModel = "Qwen/Qwen2.5-3B-Instruct",
}: TrainModelProps) {
    console.log("Train Model was clicked.")


  const startTraining = async () => {
    // const useText = !!(datasetText && datasetText.trim());
    // if (!useText && !dataFile) {
    //   alert("Provide either datasetText or dataFile.");
    //   return;
    // }

    const payload = {
      script_path: scriptPath,
      output_dir: outputDir,
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
      return;
    }
    alert("Training started!");

  };

  return (
    <button
      onClick={startTraining}
      className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800"
    >
      <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
        Train Model
      </span>
    </button>
  );
}