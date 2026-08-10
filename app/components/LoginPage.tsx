"use client";

import { Button } from "antd";
import type { FC } from "react";

import oauthStateZ from "~/utils/oauthState";

const LoginPage: FC<{
  clientId: string;
  oauthNonce: string;
  redirectTo: string;
}> = ({ clientId, oauthNonce, redirectTo }) => {
  const oauthParams = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${window.location.origin}/oauth/callback`,
    state: Array.from(
      new TextEncoder().encode(
        oauthStateZ.encode({
          nonce: oauthNonce,
          to: redirectTo,
          origin: window.location.origin,
        }),
      ),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join(""),
  });

  return (
    <div>
      <h1>登录</h1>
      <Button
        onClick={() =>
          (window.location.href =
            "https://codeforces.com/oauth/authorize?scope=openid+profile&" +
            oauthParams.toString())
        }
      >
        使用 Codeforces 登录
      </Button>
    </div>
  );
};

export default LoginPage;
