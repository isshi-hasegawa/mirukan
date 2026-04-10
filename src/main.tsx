import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/react";
import "@fontsource-variable/geist";
import "./style.css";
import { App } from "./App.tsx";
import { getAppRootElement } from "./getAppRootElement.ts";

const queryClient = new QueryClient();

createRoot(getAppRootElement()).render(
  <StrictMode>
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </NuqsAdapter>
  </StrictMode>,
);
