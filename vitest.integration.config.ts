import { defineConfig } from "vitest/config";

import base from "./vitest.config";

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ["test/integration/**/*.test.ts"],
    globalSetup: ["./test/integration/setup.ts"],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});
