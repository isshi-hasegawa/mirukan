import { fileURLToPath, URL } from "url";
import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules/", "e2e/**"],
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      exclude: [
        "node_modules/",
        "src/test/",
        "src/assets/**",
        "e2e/**",
        "**/*.test.ts",
        "**/*.test.tsx",
      ],
    },
  },
  staged: {
    "*": "./scripts/check-staged-secrets.sh && vp check --fix",
  },
  lint: { options: { typeAware: true, typeCheck: false } },
});
