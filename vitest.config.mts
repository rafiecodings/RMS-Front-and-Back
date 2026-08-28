import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // Forks pool: the threads worker fails to start in this environment
    // (worker-start timeout), which is purely infrastructural. Forks runs
    // all suites reliably without changing any application/test logic.
    pool: "forks",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
