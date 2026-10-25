import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it, vi } from "vitest";

import createEvent from "../../app/functions/createEvent";
import listEvents from "../../app/functions/listEvents";
import { PrismaClient, type Prisma } from "../../prisma/generated/client";

const context = vi.hoisted(() => ({
  database: undefined as unknown as Prisma.TransactionClient,
  actor: undefined as { id: bigint; role: string } | undefined,
}));

vi.mock("~/db", () => ({
  get default() {
    return context.database;
  },
}));
vi.mock("~/utils/getUser", () => ({ getUser: async () => context.actor }));

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString)
  throw new Error(
    "TEST_DATABASE_URL must point to a migrated, dedicated test database",
  );
if (connectionString === process.env.DATABASE_URL)
  throw new Error("TEST_DATABASE_URL must differ from DATABASE_URL");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
const rollback = new Error("Rollback test transaction");

afterAll(async () => {
  await prisma.$disconnect();
});

describe("event persistence", () => {
  it("persists choices and paginates real PostgreSQL records without duplicates", async () => {
    await expect(
      prisma.$transaction(
        async (database) => {
          context.database = database;
          const actor = await database.user.create({
            data: {
              username: `vitest-${randomUUID()}`,
              avatar: "https://example.com/avatar.png",
              codeforcesSub: randomUUID()
                .replaceAll("-", "")
                .split("")
                .map((digit) =>
                  parseInt(digit, 16).toString(2).padStart(4, "0"),
                )
                .join("")
                .padEnd(256, "0"),
              role: "ADMIN",
            },
          });
          context.actor = actor;
          const prefix = `vitest-${randomUUID()}`;
          for (const title of ["first", "second", "third"]) {
            await createEvent({
              title: `${prefix}-${title}`,
              description: "Integration fixture",
              lockAt: "2030-01-01T00:00:00Z",
              choices: [{ title: "Yes" }, { title: "No" }],
            });
          }
          const created = await database.event.findMany({
            where: { createById: actor.id },
            orderBy: { id: "desc" },
          });
          expect(created).toHaveLength(3);
          expect(created[0]).toMatchObject({
            title: `${prefix}-third`,
            lockAt: new Date("2030-01-01T00:00:00Z"),
          });
          const first = await listEvents(undefined, 2);
          expect(first.events.map((event) => event.id)).toEqual(
            created.slice(0, 2).map((event) => event.id),
          );
          expect(first.hasMore).toBe(true);
          expect(first.events[0]?.choices).toEqual([
            { title: "Yes", lastPrice: null },
            { title: "No", lastPrice: null },
          ]);
          const next = await listEvents(first.events[1]!.id, 1);
          expect(next.events[0]?.id).toBe(created[2]?.id);
          const count = await database.event.count();
          context.actor = undefined;
          await expect(createEvent({})).rejects.toThrow("Permission denied");
          expect(await database.event.count()).toBe(count);
          throw rollback;
        },
        { timeout: 10000 },
      ),
    ).rejects.toBe(rollback);
  });
});
