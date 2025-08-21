import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
// import AuthPage from "./pages/AuthPage";
import TestPage from "./pages/Test";

function App() {

  return (
    <BrowserRouter>
      <Routes>
        {/* Currently the main page / */}
        {/* <Route path="/" element={<MainPage />} /> */}

        {/* Auth form at /login */}
        {/* <Route path="/login" element={<AuthPage />} /> */}

        {/* Protected React route at /test */}
        <Route path="/test" element={<TestPage />} />

        {/* Any other path → redirect to /login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App