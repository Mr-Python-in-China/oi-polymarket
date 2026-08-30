import {
  type RouteConfig,
  route,
  prefix,
  layout,
} from "@react-router/dev/routes";

export default [
  route("/login", "routes/login.tsx"),
  route("/oauth/callback", "routes/oauthCallback.tsx"),
  route("/register-confirmation", "routes/registerConfirmation.tsx"),
  route("/", "routes/index.tsx"),
  route("/event/:eventId", "routes/event.tsx"),
  ...prefix("/admin", [
    layout("routes/admin/layout.tsx", [
      route("/event/create", "routes/admin/event/create.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
