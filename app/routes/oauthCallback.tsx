import { timingSafeEqual } from "node:crypto";

import { decodeJwt } from "jose";
import { redirect } from "react-router";
import z from "zod";

import prisma from "~/db";
import { getSession } from "~/sessions";
import oauthStateZ from "~/utils/oauthState";

import type { Route } from "./+types/oauthCallback";

const tokenResponseZ = z.object({
  access_token: z.hex().length(32),
  token_type: z.literal("bearer"),
  expires_in: z.number(),
  id_token: z.codec(
    z.jwt(),
    z.object({
      iss: z.literal("https://codeforces.com"),
      sub: z.hex().length(64),
      handle: z.string(),
      avatar: z.url(),
      rating: z.number().optional(),
    }),
    {
      decode: (jwt) => decodeJwt(jwt),
      encode: () => {
        throw new Error("Not implemented");
      },
    },
  ),
});

export const loader = async ({ url }: Route.LoaderArgs) => {
  const code = url.searchParams.get("code");
  if (!code) throw new Error("Missing code parameter in URL");
  const stateEncoded = url.searchParams.get("state");
  if (!stateEncoded) throw new Error("Missing state parameter in URL");
  const state = oauthStateZ.parse(
    Buffer.from(stateEncoded, "hex").toString("utf8"),
  );
  const session = getSession();
  const sessionState = session.get("oauthNonce");
  const expectedState = Buffer.from(sessionState ?? "");
  const receivedState = Buffer.from(state.nonce);
  if (
    expectedState.length !== receivedState.length ||
    !timingSafeEqual(expectedState, receivedState)
  ) {
    throw new Error("Invalid OAuth state");
  }
  session.unset("oauthNonce");

  const clientId = process.env.CODEFORCES_OAUTH_CLIENT_ID;
  const clientSecret = process.env.CODEFORCES_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error(
      "Internal error: CODEFORCES_OAUTH_CLIENT_ID or CODEFORCES_OAUTH_CLIENT_SECRET is not configured",
    );

  const tokenRequestBody = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: `${state.origin}/oauth/callback`,
  });

  const res = await fetch("https://codeforces.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: tokenRequestBody.toString(),
  }).catch((err) => {
    // 脱敏
    console.error("Failed to fetch access token", err);
    throw new Error("Failed to fetch access token");
  });

  if (!res.ok) {
    console.error("Codeforces token endpoint returned an error", res.status);
    throw new Error("Failed to fetch access token");
  }

  const token = await res
    .json()
    .then((body) => tokenResponseZ.parse(body))
    .catch((e) => {
      console.error("Failed to parse token response", e);
      throw new Error("Failed to parse token response");
    });
  const codeforcesSub = token.id_token.sub
    .split("")
    .map((digit) => parseInt(digit, 16).toString(2).padStart(4, "0"))
    .join("");

  const updatedUsers = await prisma.user.updateManyAndReturn({
    where: {
      codeforcesSub,
    },
    data: { username: token.id_token.handle },
  });

  if (updatedUsers.length === 0) {
    session.set("registerConfirmation", {
      codeforcesSub,
      codeforcesHandle: token.id_token.handle,
      codeforcesRating: token.id_token.rating ?? 0,
      codeforcesAvatar: token.id_token.avatar,
      initialMedal: 2e7 + (token.id_token.rating ?? 0) * 1e4,
    });
    return redirect(
      "/register-confirmation?to=" + encodeURIComponent(state.to),
      {
        status: 302,
      },
    );
  }

  if (updatedUsers.length > 1)
    throw new Error("Internal error: duplicate codeforcesSub found");

  session.set("user", { id: updatedUsers[0].id });

  return redirect(state.to, { status: 302 });
};
