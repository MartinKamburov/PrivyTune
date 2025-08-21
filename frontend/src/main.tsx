import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import MainPage from './pages/MainPage.tsx';
import './index.css';

import "bootstrap/dist/css/bootstrap.min.css";
import TestLLMPage from "./pages/TestLLMPage";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainPage />
  </StrictMode>,
)
