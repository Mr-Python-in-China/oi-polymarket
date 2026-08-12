"use server";

import { z } from "zod";

import prisma from "~/db";
import { getUser } from "~/utils/getUser";

const dataZ = z.object({
  title: z.string().nonempty(),
  description: z.string().nonempty(),
  lockAt: z.iso.datetime({ offset: true }).transform((x) => new Date(x)),
  choices: z
    .array(
      z.object({
        title: z.string().nonempty(),
      }),
    )
    .min(2)
    .max(16, "最多只能有 16 个选项"),
});

export default async function createEvent(unsafeData: unknown) {
  const user = await getUser();
  if (user?.role !== "ADMIN") throw new Error("Permission denied");
  const data = dataZ.parse(unsafeData);
  await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      lockAt: data.lockAt,
      createById: user.id,
      choices: {
        createMany: {
          data: data.choices.map((x, i) => ({ title: x.title, order: i })),
        },
      },
    },
  });
}
