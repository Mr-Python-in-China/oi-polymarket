"use server";

import prisma from "~/db";

export default async function listEvents(
  cursor: string | undefined,
  limits: number = 64,
) {
  if (
    (typeof cursor !== "string" && typeof cursor !== "undefined") ||
    typeof limits !== "number" ||
    !Number.isInteger(limits) ||
    limits <= 0
  )
    throw new TypeError("Invalid arguments");
  if (limits > 64)
    throw new RangeError("limits must be less than or equal to 64");
  return await prisma.event.findMany({
    cursor: cursor ? { id: cursor } : undefined,
    skip: cursor ? 1 : 0,
    take: limits,
    orderBy: { id: "desc" },
    select: {
      id: true,
      title: true,
      lockAt: true,
      choices: {
        select: {
          title: true,
          lastPrice: true,
        },
        orderBy: { order: "asc" },
      },
    },
  });
}
