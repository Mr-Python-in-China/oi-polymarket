import "server-only";
import { createSessionStorage } from "react-router";
import { createSessionMiddleware } from "remix-utils/middleware/session";

import { getContext } from "./context";
import prisma from "./db";

type SessionData = {
  oauthNonce?: string;
  user: {
    id: number;
  };
  registerConfirmation: {
    codeforcesSub: string;
    codeforcesHandle: string;
    codeforcesRating: number;
    codeforcesAvatar: string;
    initialMedal: number;
  };
};

const sessionStorage = createSessionStorage<SessionData>({
  cookie: {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secrets: [
      process.env.SESSION_SECRET ??
        (console.warn("SESSION_SECRET is not configured"), ""),
    ],
    secure: true,
    httpOnly: true,
  },
  createData: async (data, expires) => {
    const session = await prisma.session.create({
      data: {
        data,
        expires,
      },
    });
    return session.id;
  },
  readData: async (id) => {
    const session = await prisma.session.findUnique({
      where: { id },
    });
    if (session?.expires && session.expires <= new Date()) return null;
    return (session?.data as SessionData | undefined) ?? null;
  },
  updateData: async (id, data, expires) => {
    await prisma.session.update({
      where: { id },
      data: {
        data,
        expires,
      },
    });
  },
  deleteData: async (id) => {
    await prisma.session.delete({
      where: { id },
    });
  },
});

const createSessionMiddlewareRes = createSessionMiddleware(sessionStorage);

export const sessionMiddleware = createSessionMiddlewareRes[0];
export const getSession = () => createSessionMiddlewareRes[1](getContext());
