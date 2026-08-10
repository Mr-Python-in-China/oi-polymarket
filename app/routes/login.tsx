import { redirect } from "react-router";

import LoginPage from "~/components/LoginPage";
import { getSession } from "~/sessions";
import { getUser } from "~/utils/getUser";

import type { Route } from "./+types/login";

export const loader = async ({ url }: Route.LoaderArgs) => {
  const redirectTo = url.searchParams.get("redirectTo") ?? "/";
  const user = await getUser();
  if (user) throw redirect(redirectTo, { status: 302 });
  const oauthNonce = crypto.randomUUID();
  getSession().set("oauthNonce", oauthNonce);
  return { redirectTo, oauthNonce };
};

export const ServerComponent = ({
  loaderData: { oauthNonce, redirectTo },
}: Route.ServerComponentProps) => {
  const clientId = process.env.CODEFORCES_OAUTH_CLIENT_ID;
  if (!clientId) {
    throw new Error("CODEFORCES_OAUTH_CLIENT_ID is not configured");
  }

  return (
    <LoginPage
      clientId={clientId}
      oauthNonce={oauthNonce}
      redirectTo={redirectTo}
    />
  );
};
