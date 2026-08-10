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
  const id = (
    (await prisma.$queryRawTyped(
      register(
        registerConfirmationInfo.codeforcesHandle,
        registerConfirmationInfo.codeforcesAvatar,
        registerConfirmationInfo.codeforcesSub,
      ),
    )) as [{ id: number }]
  )[0].id;
  session.set("user", { id });
  session.unset("registerConfirmation");
}
