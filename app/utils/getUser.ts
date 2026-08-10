import { cache } from "react";

import { getSession } from "~/sessions";

import prisma from "../db";

export const getUser = cache(async () => {
  const session = getSession();
  const uid = session.get("user")?.id;
  const user =
    uid === undefined
      ? undefined
      : await prisma.user.findUnique({ where: { id: uid } }).then((u) => {
          if (!u)
            throw new Error(`Internal Error: User with id ${uid} not found`);
          return u;
        });
  return user;
});
