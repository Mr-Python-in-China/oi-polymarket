import { redirect } from "react-router";

import RegisterConfirmationPage from "~/components/RegisterConfirmationPage";
import { getSession } from "~/sessions";

export const ServerComponent = async () => {
  const session = getSession();
  const x = session.get("registerConfirmation");
  if (!x) throw redirect("/login");
  return <RegisterConfirmationPage {...x} />;
};
