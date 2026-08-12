import { getUser } from "~/utils/getUser";

export const loader = async () => {
  const user = await getUser();
  if (user?.role !== "ADMIN")
    throw new Response("Unauthorized", { status: 401 });
};
