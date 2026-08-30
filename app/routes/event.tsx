import type { FC } from "react";
import { z } from "zod";

import { EventPage } from "~/components/EventPage";
import prisma from "~/db";

import type { Route } from "./+types/event";

export const ServerComponent: FC<Route.ServerComponentProps> = async ({
  params: { eventId: eventIdParam },
}) => {
  const eventId = z.bigint().parse(BigInt(eventIdParam));
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true,
      title: true,
      description: true,
      lockAt: true,
      choices: {
        select: {
          id: true,
          title: true,
          lastPrice: true,
        },
      },
      createBy: {
        select: {
          id: true,
          username: true,
        },
      },
      createdAt: true,
    },
  });
  if (!event) throw new Error("Event not found");
  return <EventPage event={event} />;
};
