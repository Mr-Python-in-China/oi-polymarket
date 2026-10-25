import { execFileSync } from "node:child_process";

import { afterEach, expect, it, vi } from "vitest";

import setup from "../integration/setup";

vi.mock("node:child_process", () => ({
  execFileSync: vi.fn<typeof execFileSync>(),
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it("rejects missing test configuration before migration", () => {
  vi.stubEnv("TEST_DATABASE_URL", "");
  expect(setup).toThrow(
    "TEST_DATABASE_URL must point to a dedicated test database",
  );
  expect(execFileSync).not.toHaveBeenCalled();
});

it("rejects the same database even with different credentials", () => {
  vi.stubEnv("DATABASE_URL", "postgresql://dev:password@db/app");
  vi.stubEnv("TEST_DATABASE_URL", "postgresql://test:password@db:5432/app");
  expect(setup).toThrow("Test and development databases must be different");
  expect(execFileSync).not.toHaveBeenCalled();
});

it("migrates only the explicit test database", () => {
  vi.stubEnv("DATABASE_URL", "postgresql://dev:password@db/app");
  vi.stubEnv("TEST_DATABASE_URL", "postgresql://test:password@test-db/tests");
  setup();
  expect(execFileSync).toHaveBeenCalledWith(
    "pnpm",
    ["exec", "prisma", "migrate", "deploy"],
    expect.objectContaining({
      env: expect.objectContaining({
        DATABASE_URL: process.env.TEST_DATABASE_URL,
      }),
    }),
  );
});
