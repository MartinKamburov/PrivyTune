PrivyTune

Privacy‑First Browser LLM Fine‑Tuning Studio

PrivyTune lets users fine‑tune small open‑source language models entirely in their browser using WebGPU, with zero server‑side compute and no raw data ever leaving the device. Users can drag‑and‑drop plaintext or CSV datasets, train a LoRA adapter on a base model (e.g. Phi‑3‑mini or Gemma 2B), and export a tiny .safetensors file for use in local runtimes like LM‑Studio, llama.cpp, or WebLLM.

🚀 Key Features

Local Fine‑Tuning: Runs LoRA/QLoRA training loops fully client‑side via WebGPU compute shaders.

Privacy & Compliance: Raw text and gradients never leave the browser; backend only handles auth and optional adapter sharing.

IndexedDB Caching: Downloads and shards of INT4 models (ONNX/GGUF) are cached for instant reloads and offline use.

Model Marketplace: Backend‑driven manifest API to list, version‑pin, and license‑gate base models (Phi‑3‑mini, Gemma 2B).

LoRA Adapter Export: Outputs low‑rank delta weights (<1 % of model size) as .safetensors for universal compatibility.

Progressive UX: Web Worker tokenization, streaming progress & live loss charts, graceful fallback to WASM/CPU on unsupported devices.

Secure Sharing: Optional presigned‑URL upload of adapters; Spring Security + JWT + Postgres for audit.

🎯 MVP Scope

Single base model: Xenova/phi-3-mini-4k-instruct-int4

LoRA rank‑16, INT4 quantization

Dataset: CSV/plain‑text with prompt,response columns

Browsers: Chrome 124+, Edge 124+

Non‑goals: multi‑adapter stacking, >4 GB VRAM models

🛠️ Tech Stack

Layer

Tech & Tools

Frontend

React 18 + TypeScript, Vite, Tailwind CSS, Transformers.js v3 (WebGPU), IDB‑Keyval, Chart.js

Backend

Spring Boot 3.4 (Java 21), Spring Security (JWT), S3 presigned URLs, PostgreSQL 15

DevOps

Docker‑Compose (local), GitHub Actions CI/CD, Cloudflare Pages (frontend), Railway/Fly.io (backend + DB)

Model I/O

ONNX/GGUF INT4 shards, JSON manifest API, WebGPU execution provider, SentencePiece tokenization (WASM)

📥 Installation & Setup

Clone the repo

git clone https://github.com/MartinKamburov/PrivyTune.git
cd privytune

Environment

Node.js ≥ 18, npm

Java 21+, Maven or Gradle

Docker & Docker‑Compose

Configure

Copy backend/.env.example → .env, set:

DATABASE_URL=postgres://user:pass@localhost:5432/privytune
JWT_SECRET=<your‑secret>
S3_BUCKET=<your‑bucket>
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

Copy frontend/.env.example → .env, set:

VITE_API_BASE_URL=http://localhost:8080/api

Bring up services

docker-compose up -d   # starts Postgres, backend, frontend dev server

Local dev

Backend: cd backend && ./mvnw spring-boot:run

Frontend: cd frontend && npm install && npm run dev

Open http://localhost:5173 in Chrome 124+ or Edge 124+.

📖 Usage

Select Base Model – choose from the model list (e.g. Phi‑3‑mini).

Import Dataset – drag CSV or paste plaintext (prompt/response pairs).

Fine‑Tune – click “Train”; watch live loss curve and progress bar.

Chat & Compare – interact with base & tuned model in side‑by‑side playground.

Export Adapter – download .safetensors for use in other LLM runtimes.

📐 Architecture Overview

┌────────────────────────────┐      ┌──────────────────────────────┐
│        Frontend PWA        │◀───▶│      Spring Boot Backend     │
│  • Model loader & cache    │      │  • Manifest & licensing API  │
│  • WebGPU training engine  │      │  • Auth, presigned URL give  │
│  • Chat + metrics charts   │      │  • Postgres metadata store   │
└───────────▲─────┬───────────┘      └──────────────▲───────────────┘
            │     │                               │
            │     │ (WebGPU)                      │ (S3)
            ▼     │                               ▼
   GPU Compute    └── IndexedDB cache  ┌───────────────────┐
   (LoRA shaders)                    │   S3 / CDN Storage  │
                                     └───────────────────┘

📄 License

This project is licensed under the MIT License.

🤝 Contributing

Fork the repo and create a branch (git checkout -b feat/my-feature).

Commit your changes (git commit -m "feat: add ...").

Push to your branch (git push origin feat/my-feature).

Open a Pull Request.

Please ensure all tests pass and linting is green. See CONTRIBUTING.md for guidelines.

📬 Contact

Maintained by martinivkamburov@gmail.com. Pull requests and issues are welcome!