// import { env } from '@huggingface/transformers';
// import * as idbKeyval from 'idb-keyval';

// async function customFetch(url: string, init?: RequestInit): Promise<Response> {
//   console.log('🔍 customFetch:', url);
//   const cached = await idbKeyval.get<ArrayBuffer|object>(url);
//   if (cached) {
//     if (url.endsWith('.json')) {
//       return new Response(JSON.stringify(cached), {
//         headers: { 'Content-Type': 'application/json' },
//       });
//     }
//     return new Response(cached as ArrayBuffer);
//   }
//   return window.fetch(url, init);
// }

// // ① globally override env.fetch
// ;(env as any).fetch = customFetch;
// env.allowRemoteModels = false;
// env.allowLocalModels  = true;
// env.localModelPath    = 'https://d3b5vir3v79bpg.cloudfront.net/';

// console.log(env);
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import "bootstrap/dist/css/bootstrap.min.css";
import TestLLMPage from "./pages/TestLLMPage";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TestLLMPage />
  </StrictMode>,
)
