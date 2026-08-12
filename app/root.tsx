import { ConfigProvider, App as AntApp } from "antd";
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { contextStorageMiddleware } from "./context";
import { sessionMiddleware } from "./sessions";

import "./app.css";
import { getUser } from "./utils/getUser";
import { UserContextProvider } from "./utils/userContext";

export const middleware: Route.MiddlewareFunction[] = [
  contextStorageMiddleware,
  sessionMiddleware,
];

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
      </body>
    </html>
  );
};

export const ServerComponent = async () => {
  const user = await getUser();
  return (
    <UserContextProvider
      value={
        user
          ? {
              status: "authenticated",
              id: user.id,
              name: user.username,
              role: user.role,
            }
          : { status: "unauthenticated" }
      }
    >
      <ConfigProvider>
        <AntApp>
          <Outlet />
        </AntApp>
      </ConfigProvider>
    </UserContextProvider>
  );
};

export const ErrorBoundary = ({ error }: Route.ErrorBoundaryProps) => {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main>
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
};
