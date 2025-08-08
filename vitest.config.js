import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.js"],
    include: ["**/*.test.js", "**/__tests__/**/*.js"],
    coverage: {
      reporter: ["text", "json", "html"],
      include: ["app/src/**/*.js"],
      exclude: ["app/src/**/*.test.js", "**/node_modules/**"],
    },
  },
});
