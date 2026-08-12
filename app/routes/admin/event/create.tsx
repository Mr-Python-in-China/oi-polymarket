import type { FC } from "react";

import CreateEventPage from "~/components/CreateEventPage";

import type { Route } from "./+types/create";

export const ServerComponent: FC<Route.ServerComponentProps> = async () => {
  return <CreateEventPage />;
};
