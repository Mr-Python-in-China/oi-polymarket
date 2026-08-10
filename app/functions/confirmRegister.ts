"use server";

import prisma from "~/db";
import { getSession } from "~/sessions";

export default async function confirmRegister() {
  const session = getSession();
  const registerConfirmationInfo = session.get("registerConfirmation");
  if (!registerConfirmationInfo)
    throw new Error("No register confirmation info in session");
  const user = await prisma.user.create({
    data: {
      username: registerConfirmationInfo.codeforcesHandle,
      avatar: registerConfirmationInfo.codeforcesAvatar,
      codeforcesSub: registerConfirmationInfo.codeforcesSub,
    },
  });
  session.set("user", { id: user.id });
  session.unset("registerConfirmation");
}
