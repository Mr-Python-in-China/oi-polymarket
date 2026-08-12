import type { FC } from "react";

import IndexPage from "~/components/IndexPage";
import listEvents from "~/functions/listEvents";

import type { Route } from "./+types/index";
export const ServerComponent: FC<Route.ServerComponentProps> = async () => {
  const initialEvents = await listEvents(undefined);
  return <IndexPage initialEvents={initialEvents} />;
};
