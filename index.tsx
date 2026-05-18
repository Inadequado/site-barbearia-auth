import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import HomePage from "./components/HomePage";
import ErrorBoundary from "./components/ErrorBoundary";
import { loadAllData } from "./dataLoader";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

function renderApp() {
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/agendar" element={<App />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  );
}

function renderError(err: unknown) {
  root.render(
    <div style={{
      padding: "2rem",
      fontFamily: "system-ui, sans-serif",
      color: "#c33",
      textAlign: "center",
    }}>
      <h2>Erro ao carregar o site</h2>
      <p>{String(err)}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: "1rem", padding: "0.5rem 1rem" }}>
        Tentar de novo
      </button>
    </div>
  );
}

// Carrega dados ANTES de renderizar — assim SITE_CONFIG e SERVICES já estão prontos
loadAllData()
  .then(renderApp)
  .catch(renderError);
