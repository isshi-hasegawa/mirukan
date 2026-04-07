import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";

import.meta.env.VITE_SUPABASE_URL ??= "http://localhost:54321";
import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??= "test-publishable-key";

// Start MSW eagerly for all tests.
server.listen({ onUnhandledRequest: "error" });
