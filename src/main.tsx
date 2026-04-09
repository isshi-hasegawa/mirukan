import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "./style.css";
import { App } from "./App.tsx";
import { getAppRootElement } from "./getAppRootElement.ts";

createRoot(getAppRootElement()).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
