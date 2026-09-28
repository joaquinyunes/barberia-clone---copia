import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: { environment: "jsdom", setupFiles: ["./src/test/setup.ts"], css: false, include: ["src/**/*.test.{ts,tsx}"] },
});
