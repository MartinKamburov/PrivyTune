# from fastapi import FastAPI

# app = FastAPI()

# @app.get("/")
# def root():
#     return {"Test": "Hello"}

# @app.get("/train")
# def train_llm():

#     return {"Hello": "World"}
# main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
import subprocess, sys, json, tempfile

app = FastAPI(title="PrivyTune Trainer")

# Allow your React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Schemas ----------
class TrainBody(BaseModel):
    # Paths coming from your frontend
    script_path: str = Field(..., description="Full path to finetuning_llm.py OR its folder")
    output_dir: str = Field(..., description="Where to save the trained adapters")
    data_file: str = Field(..., description="Path to your dataset JSON")

    # Optional knobs (match finetuning_llm.py CLI)
    base_model: str = "Qwen/Qwen2.5-3B-Instruct"
    max_len: int = 256
    repeat: int = 30
    max_steps: int = 120
    lr: float = 2e-4

# ---------- Helpers ----------
def _resolve_script(script_path: str) -> Path:
    sp = Path(script_path)
    script = sp if sp.suffix == ".py" else (sp / "finetuning_llm.py")
    if not script.exists():
        raise HTTPException(status_code=400, detail=f"finetuning_llm.py not found at: {script}")
    return script

def _start_process(cmd: list[str], cwd: Path):
    try:
        subprocess.Popen(
            cmd,
            cwd=str(cwd),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start training: {e!r}")

# ---------- Endpoints ----------
@app.get("/")
def root():
    return {"ok": True}

@app.post("/train")
def train_llm(body: TrainBody):
    script = _resolve_script(body.script_path)

    out_dir = Path(body.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, str(script),
        "--base_model", body.base_model,
        "--data_file", str(Path(body.data_file).resolve()),
        "--output_dir", str(out_dir.resolve()),
        "--max_len", str(body.max_len),
        "--repeat", str(body.repeat),
        "--max_steps", str(body.max_steps),
        "--lr", str(body.lr),
    ]
    _start_process(cmd, cwd=script.parent)
    return {"status": "started", "script": str(script), "output_dir": str(out_dir)}

