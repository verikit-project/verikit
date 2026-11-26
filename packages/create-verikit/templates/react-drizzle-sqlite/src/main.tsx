import { createClient } from "verikit/client";
import { VerikitProvider } from "verikit/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";

const client = createClient({ baseUrl: "/api" });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <VerikitProvider client={client}>
      <App />
    </VerikitProvider>
  </StrictMode>,
);
