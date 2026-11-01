"use server";

import { z } from "zod";
import { submitOrder as submitOrderQuery } from "~prisma/sql";

import prisma from "~/db";
import { getUser } from "~/utils/getUser";

const positiveId = z.bigint().positive().max(9223372036854775807n);
const dataZ = z.object({
  eventId: positiveId,
  choiceId: positiveId,
  side: z.enum(["BUY", "SELL"]),
  price: z.number().int().min(0).max(1000),
  quantity: positiveId,
  idempotencyKey: z.string().trim().min(1).max(128),
});

export default async function submitOrder(unsafeData: unknown) {
  const user = await getUser();
  if (!user) throw new Error("Permission denied");
  const data = dataZ.parse(unsafeData);
  const [order] = await prisma.$queryRawTyped(
    submitOrderQuery(
      user.id,
      data.eventId,
      data.choiceId,
      data.side,
      data.price,
      data.quantity,
      data.idempotencyKey,
    ),
  );
  if (!order) throw new Error("Order submission failed");
  return order;
}
