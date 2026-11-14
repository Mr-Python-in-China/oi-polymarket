"use server";

import prisma from "~/db";

export default async function listEvents(
  cursor: bigint | undefined,
  limits: number = 64,
) {
  if (
    (typeof cursor !== "bigint" && typeof cursor !== "undefined") ||
    typeof limits !== "number" ||
    !Number.isInteger(limits) ||
    limits <= 0
  )
    throw new TypeError("Invalid arguments");
  if (limits > 64)
    throw new RangeError("limits must be less than or equal to 64");
  const res = await prisma.event.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limits + 1,
    orderBy: { id: "desc" },
    select: {
      id: true,
      title: true,
      lockAt: true,
      choices: {
        select: {
          title: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });
  return {
    events: res.slice(0, limits).map((x) => ({
      ...x,
      choices: x.choices.map((y) => ({
        title: y.title,
        lastPrice: null, // TODO lastPrice 含义变化
      })),
    })),
    hasMore: res.length > limits,
  };
}
