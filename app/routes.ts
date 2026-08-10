import { type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("/login", "routes/login.tsx"),
  route("/oauth/callback", "routes/oauthCallback.tsx"),
  route("/register-confirmation", "routes/registerConfirmation.tsx"),
  route("/", "routes/index.tsx"),
] satisfies RouteConfig;
