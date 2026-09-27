import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra el entorno local: API en :4000 (con `npm run seed`) y Vite en :5173.
 * Uso: npm run test:e2e
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    screenshot: "only-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /public\.spec/ },
  ],
});
