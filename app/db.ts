import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "~prisma/client";

if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL environment variable is not set");

declare global {
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = globalThis.prisma || new PrismaClient({ adapter });
globalThis.prisma = prisma;

export default prisma;
