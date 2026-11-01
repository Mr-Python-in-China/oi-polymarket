import { randomUUID } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import submitOrder from "../../app/functions/submitOrder";
import { PrismaClient } from "../../prisma/generated/client";
import { submitOrder as query } from "../../prisma/generated/sql";

const context = vi.hoisted(() => ({
  actor: undefined as { id: bigint } | undefined,
}));
vi.mock("~/utils/getUser", () => ({ getUser: async () => context.actor }));
vi.mock("~/db", () => ({
  get default() {
    return prisma;
  },
}));

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString || connectionString === process.env.DATABASE_URL)
  throw new Error("A dedicated TEST_DATABASE_URL is required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});
let actorId: bigint;
const eventIds: bigint[] = [];

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      username: `orders-${randomUUID()}`,
      avatar: "test",
      codeforcesSub: randomUUID()
        .replaceAll("-", "")
        .split("")
        .map((digit) => parseInt(digit, 16).toString(2).padStart(4, "0"))
        .join("")
        .padEnd(256, "0"),
    },
  });
  actorId = user.id;
  context.actor = user;
});

afterAll(async () => {
  if (actorId !== undefined) {
    await prisma.trade.deleteMany({
      where: { takerOrder: { userId: actorId } },
    });
    await prisma.order.deleteMany({ where: { userId: actorId } });
    await prisma.choice.deleteMany({ where: { eventId: { in: eventIds } } });
    await prisma.event.deleteMany({ where: { id: { in: eventIds } } });
    await prisma.user.delete({ where: { id: actorId } });
  }
  await prisma.$disconnect();
});

async function fixture() {
  const event = await prisma.event.create({
    data: {
      title: "Matching fixture",
      description: "test",
      createById: actorId,
      lockAt: new Date(Date.now() + 3600000),
      choices: { create: [{ title: "Yes" }, { title: "No" }] },
    },
    include: { choices: { orderBy: { id: "asc" } } },
  });
  eventIds.push(event.id);
  const choiceId = event.choices[0]!.id;
  const order = async (
    side: "BUY" | "SELL",
    price: number,
    quantity: bigint,
    key = randomUUID(),
  ) => {
    const [result] = await prisma.$queryRawTyped(
      query(actorId, event.id, choiceId, side, price, quantity, key),
    );
    return result!;
  };
  return { event, choiceId, order };
}

describe("SQL order matching", () => {
  it("loops in price/time priority, keeps a remainder, and resumes on a new order", async () => {
    const { order, choiceId } = await fixture();
    const expensive = await order("SELL", 600, 2n);
    const first = await order("SELL", 400, 3n);
    const second = await order("SELL", 400, 4n);
    const buy = await order("BUY", 500, 10n);
    expect(buy).toMatchObject({
      status: "PARTIALLY_FILLED",
      remainingQuantity: 3n,
    });
    const trades = await prisma.trade.findMany({
      where: { takerOrderId: buy.id! },
      orderBy: { id: "asc" },
    });
    expect(
      trades.map((trade) => [trade.makerOrderId, trade.price, trade.quantity]),
    ).toEqual([
      [first.id, 400, 3n],
      [second.id, 400, 4n],
    ]);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: expensive.id! } }),
    ).toMatchObject({ status: "OPEN" });
    await order("SELL", 450, 3n);
    expect(
      await prisma.order.findUniqueOrThrow({ where: { id: buy.id! } }),
    ).toMatchObject({ status: "FILLED", remainingQuantity: 0n });
    expect(
      await prisma.choice.findUniqueOrThrow({ where: { id: choiceId } }),
    ).toMatchObject({ lastPrice: 500 });
  });

  it("prioritizes the highest bid for a sell", async () => {
    const { order } = await fixture();
    await order("BUY", 400, 2n);
    const best = await order("BUY", 600, 2n);
    const sell = await order("SELL", 300, 1n);
    expect(
      await prisma.trade.findFirstOrThrow({
        where: { takerOrderId: sell.id! },
      }),
    ).toMatchObject({ makerOrderId: best.id, price: 600, quantity: 1n });
  });

  it("serializes concurrent submissions without overselling and makes retries idempotent", async () => {
    const { order, choiceId } = await fixture();
    await order("SELL", 300, 10n);
    await Promise.all(Array.from({ length: 12 }, () => order("BUY", 400, 1n)));
    const trades = await prisma.trade.findMany({
      where: { takerOrder: { choiceId } },
    });
    expect(trades.reduce((total, trade) => total + trade.quantity, 0n)).toBe(
      10n,
    );
    expect(
      await prisma.order.count({ where: { choiceId, status: "OPEN" } }),
    ).toBe(2);
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => order("BUY", 200, 1n, key)),
    );
    expect(new Set(results.map((result) => result.id)).size).toBe(1);
    await expect(order("BUY", 201, 1n, key)).rejects.toThrow(
      "different parameters",
    );
  });

  it("rejects closed events and invalid ownership, but allows an idempotent retry after close", async () => {
    const { event, choiceId, order } = await fixture();
    const key = randomUUID();
    const original = await order("BUY", 300, 1n, key);
    const other = await fixture();
    await expect(
      prisma.$queryRawTyped(
        query(actorId, other.event.id, choiceId, "BUY", 300, 1n, randomUUID()),
      ),
    ).rejects.toThrow("does not belong");
    await prisma.event.update({
      where: { id: event.id },
      data: { lockAt: new Date(0) },
    });
    await expect(order("BUY", 300, 1n)).rejects.toThrow("closed");
    expect((await order("BUY", 300, 1n, key)).id).toBe(original.id);
  });

  it("validates SQL parameters and service authentication", async () => {
    const { event, choiceId } = await fixture();
    await expect(
      prisma.$queryRawTyped(
        query(actorId, event.id, choiceId, "BUY", 1001, 1n, randomUUID()),
      ),
    ).rejects.toThrow("Invalid order");
    await expect(
      submitOrder({
        eventId: event.id,
        choiceId,
        side: "BUY",
        price: 500,
        quantity: 1n,
        idempotencyKey: randomUUID(),
      }),
    ).resolves.toMatchObject({ status: "OPEN" });
    context.actor = undefined;
    await expect(submitOrder({})).rejects.toThrow("Permission denied");
    context.actor = { id: actorId };
  });
});
