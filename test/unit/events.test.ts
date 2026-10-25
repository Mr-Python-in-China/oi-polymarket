import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

import createEvent from "../../app/functions/createEvent";
import listEvents from "../../app/functions/listEvents";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn<(...args: unknown[]) => Promise<unknown[]>>(),
  create: vi.fn<(...args: unknown[]) => Promise<void>>(),
  getUser: vi.fn<() => Promise<{ id: bigint; role: string } | undefined>>(),
}));

vi.mock("~/db", () => ({ default: { event: mocks } }));
vi.mock("~/utils/getUser", () => ({ getUser: mocks.getUser }));

const input = {
  title: "Event",
  description: "Description",
  lockAt: "2030-01-01T12:00:00+08:00",
  choices: [{ title: "Yes" }, { title: "No" }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ id: 7n, role: "ADMIN" });
  mocks.findMany.mockResolvedValue([]);
});

describe("listEvents", () => {
  it("uses default pagination and orders events and choices", async () => {
    expect(await listEvents(undefined)).toEqual({ events: [], hasMore: false });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: undefined,
        skip: 0,
        take: 65,
        orderBy: { id: "desc" },
        select: expect.objectContaining({
          choices: expect.objectContaining({ orderBy: { id: "asc" } }),
        }),
      }),
    );
  });

  it("uses the extra row only to detect another page", async () => {
    const rows = [{ id: 3n }, { id: 2n }, { id: 1n }];
    mocks.findMany.mockResolvedValue(rows);
    expect(await listEvents(4n, 2)).toEqual({
      events: rows.slice(0, 2),
      hasMore: true,
    });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: 4n }, skip: 1, take: 3 }),
    );
    mocks.findMany.mockResolvedValue(rows.slice(0, 2));
    expect((await listEvents(undefined, 2)).hasMore).toBe(false);
  });

  it.each([0, -1, 1.5, NaN, Infinity, "2"])(
    "rejects invalid limit %s before querying",
    async (limit) => {
      await expect(listEvents(undefined, limit as number)).rejects.toThrow(
        TypeError,
      );
      expect(mocks.findMany).not.toHaveBeenCalled();
    },
  );

  it("rejects invalid cursor and oversized pages", async () => {
    await expect(listEvents("1" as unknown as bigint)).rejects.toThrow(
      TypeError,
    );
    await expect(listEvents(undefined, 65)).rejects.toThrow(RangeError);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("createEvent", () => {
  it.each([undefined, { id: 1n, role: "USER" }])(
    "denies unauthorized callers",
    async (user) => {
      mocks.getUser.mockResolvedValue(user);
      await expect(createEvent(input)).rejects.toThrow("Permission denied");
      expect(mocks.create).not.toHaveBeenCalled();
    },
  );

  it("writes validated data with the authenticated creator", async () => {
    await createEvent(input);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        title: input.title,
        description: input.description,
        lockAt: new Date(input.lockAt),
        createById: 7n,
        choices: { createMany: { data: input.choices } },
      },
    });
  });

  it.each([
    { title: "" },
    { description: "" },
    { lockAt: "2030-01-01" },
    { choices: [{ title: "Yes" }] },
    { choices: [{ title: "" }, { title: "No" }] },
    { choices: Array.from({ length: 17 }, () => ({ title: "Choice" })) },
  ])("rejects invalid event %# without writing", async (override) => {
    await expect(createEvent({ ...input, ...override })).rejects.toThrow(
      ZodError,
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts sixteen choices", async () => {
    await createEvent({
      ...input,
      choices: Array.from({ length: 16 }, () => ({ title: "Choice" })),
    });
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});
