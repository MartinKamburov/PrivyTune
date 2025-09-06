import { useState } from "react";
import { InferenceClient } from "@huggingface/inference";

const HuggingFaceAPI = new InferenceClient(import.meta.env.VITE_HUGGINGFACE_KEY);

type Props = {
  usersInputData: string;
};

export default function FormatUserInput({ usersInputData }: Props) {
    const [result, setResult] = useState("");


    async function callHuggingFaceAPI(inputData: string) {
        try {
            const response = await HuggingFaceAPI.chatCompletion({
                model: "openai/gpt-oss-20b",
                messages: [
                    {
                    role: "user",
                    content: `Generate a JSON file where each entry has the format:
                        { "prompt": "a question about the most important details of the provided text", 
                        "completion": "a concise answer that summarizes that detail." }

                        Guidelines:
                        - Extract key questions that capture the most important concepts, facts, relationships, or themes from the text, whether it is narrative, informational, or technical.
                        - Make sure the prompt has a mention of the texts name or context
                        - Ensure each completion is no longer than 2–3 sentences.
                        - Write questions that an intelligent reader would naturally ask about the text.
                        - Avoid trivial details; focus on what summarizes the story and context best.
                        - The output must be valid JSON, not prose, and should be an array of Q&A objects.

                        Here is the text: ${inputData}`,
                    },
                ],
            });

            let content = response.choices[0].message.content ?? "";

            content = content.replace(/```json\s*|\s*```/g, "");

            console.log("HF API response:", content);

            // save to state for UI
            setResult(content);

            // --- Create downloadable JSON file ---
            const blob = new Blob([content], { type: "application/json" });
            const url = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = "input_data.json"; // file name
            link.click();

            // cleanup
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Error calling HF API:", err);
        }
    }
    

    return (
        <div>
            <button onClick={() => callHuggingFaceAPI(usersInputData)} className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800">
                <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-transparent group-hover:dark:bg-transparent">
                Format Input
                </span>
            </button>

            {result && (
                <p className="mt-4 p-2 bg-gray-100 rounded text-black">{result}</p>
            )}
        </div>
    );
};