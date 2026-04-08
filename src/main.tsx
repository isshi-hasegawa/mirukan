import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/geist";
import "./style.css";
import { App } from "./App.tsx";
import { PrivacyPolicyPage } from "./features/backlog/components/PrivacyPolicyPage.tsx";
import { TermsOfServicePage } from "./features/backlog/components/TermsOfServicePage.tsx";

function Root() {
  const { pathname } = window.location;
  if (pathname === "/privacy") return <PrivacyPolicyPage />;
  if (pathname === "/terms") return <TermsOfServicePage />;
  return <App />;
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
