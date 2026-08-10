import { getUser } from "~/utils/getUser";
export const ServerComponent = async () => {
  const user = await getUser();
  return user ? "当前用户：" + user.username : "未登录";
};
