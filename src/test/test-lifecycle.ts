import { cleanup } from "@testing-library/react";
import { server } from "./mocks/server";
import { resetMockData } from "./mocks/handlers";

export function setupTestLifecycle() {
  afterEach(() => {
    cleanup();
    server.resetHandlers();
    resetMockData();
  });
}
