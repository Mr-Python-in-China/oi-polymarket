"use server";

import { register } from "~prisma/sql";

import prisma from "~/db";
import { getSession } from "~/sessions";

export default async function confirmRegister() {
  const session = getSession();
  const registerConfirmationInfo = session.get("registerConfirmation");
  if (!registerConfirmationInfo)
    throw new Error("No register confirmation info in session");
  // });
  const result = await prisma.$queryRawTyped(
    register(
      registerConfirmationInfo.codeforcesHandle,
      registerConfirmationInfo.codeforcesAvatar,
      registerConfirmationInfo.codeforcesSub,
    ),
  );
  const id = result[0]?.id as bigint | undefined;
  if (id === undefined) throw new Error("Failed to register user");
  session.set("user", { id: String(id) });
  session.unset("registerConfirmation");
}
