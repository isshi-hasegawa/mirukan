import "@testing-library/jest-dom/vitest";
import { server } from "./mocks/server";

// Start MSW eagerly for all tests.
server.listen({ onUnhandledRequest: "error" });
