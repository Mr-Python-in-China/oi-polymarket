import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
      "~prisma": fileURLToPath(new URL("./prisma/generated", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    clearMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          globalSetup: ["./test/integration/setup.ts"],
          fileParallelism: false,
          testTimeout: 15000,
          hookTimeout: 15000,
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}"],
      exclude: ["app/**/*.d.ts"],
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage/all",
    },
  },
});
