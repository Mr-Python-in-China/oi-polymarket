import type { FC } from "react";
import { redirect } from "react-router";

import RegisterConfirmationPage from "~/components/RegisterConfirmationPage";
import { getSession } from "~/sessions";

import type { Route } from "./+types/registerConfirmation";

export const ServerComponent: FC<Route.ServerComponentProps> = async () => {
  const session = getSession();
  const x = session.get("registerConfirmation");
  if (!x) throw redirect("/login");
  return <RegisterConfirmationPage {...x} />;
};
