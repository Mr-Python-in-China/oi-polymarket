import type { FC } from "react";

import { getUser } from "~/utils/getUser";

import type { Route } from "./+types/index";
export const ServerComponent: FC<Route.ServerComponentProps> = async () => {
  const user = await getUser();
  return user ? "当前用户：" + user.username : "未登录";
};
