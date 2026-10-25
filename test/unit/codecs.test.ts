import { describe, expect, it } from "vitest";
import z from "zod";

import jsonCodec from "../../app/utils/jsonCodec";
import oauthStateZ from "../../app/utils/oauthState";

describe("jsonCodec", () => {
  const codec = jsonCodec(z.object({ value: z.number() }));

  it("round trips structured data", () => {
    const value = { value: 42 };
    expect(codec.decode(codec.encode(value))).toEqual(value);
  });

  it.each(["{", '{"value":"wrong"}', "null"])(
    "rejects invalid input %s",
    (input) => {
      expect(codec.safeDecode(input).success).toBe(false);
    },
  );
});

describe("oauthState", () => {
  const state = {
    nonce: "550e8400-e29b-41d4-a716-446655440000",
    origin: "https://example.com",
    to: "/events",
  };

  it("round trips through the OAuth hexadecimal transport", () => {
    const encoded = Buffer.from(oauthStateZ.encode(state)).toString("hex");
    expect(oauthStateZ.decode(Buffer.from(encoded, "hex").toString())).toEqual(
      state,
    );
  });

  it.each([
    { ...state, nonce: "invalid" },
    { ...state, origin: "invalid" },
    { nonce: state.nonce, origin: state.origin },
  ])("rejects invalid state %#", (input) => {
    expect(oauthStateZ.safeDecode(JSON.stringify(input)).success).toBe(false);
  });
});
