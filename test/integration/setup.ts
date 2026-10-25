import { execFileSync } from "node:child_process";

export default function setup() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString)
    throw new Error(
      "TEST_DATABASE_URL must point to a dedicated test database",
    );
  const target = new URL(connectionString);
  if (!["postgres:", "postgresql:"].includes(target.protocol))
    throw new Error("TEST_DATABASE_URL must use PostgreSQL");
  const development = process.env.DATABASE_URL;
  if (development) {
    const source = new URL(development);
    if (
      source.hostname === target.hostname &&
      (source.port || "5432") === (target.port || "5432") &&
      source.pathname === target.pathname
    )
      throw new Error("Test and development databases must be different");
  }
  execFileSync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: connectionString },
    stdio: "inherit",
  });
}
