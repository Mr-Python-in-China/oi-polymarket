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
    include: ["test/unit/**/*.test.ts"],
    clearMocks: true,
  },
});
