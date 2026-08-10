import z from "zod";

import jsonCodec from "./jsonCodec";

const oauthStateZ = jsonCodec(
  z.object({
    nonce: z.uuid(),
    to: z.string(),
    origin: z.url(),
  }),
);

export default oauthStateZ;
