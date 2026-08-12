"use client";

import { createContext, use, type ReactNode } from "react";

export type UserContextType =
  | {
      status: "authenticated";
      id: number;
      name: string;
      role: "USER" | "ADMIN";
    }
  | {
      status: "unauthenticated";
    };

export const userContext = createContext<UserContextType | undefined>(
  undefined,
);

export const useUser = () => {
  const user = use(userContext);
  if (!user)
    throw new Error(
      "Internal Error: useUser must be used within a UserProvider",
    );
  return user;
};

export const useAuthenticatedUser = () => {
  const user = useUser();
  if (user.status !== "authenticated") throw new UnauthenticatedError();
  return user;
};

export class UnauthenticatedError extends Error {
  constructor() {
    super("Authentication required");
  }
}

export const UserContextProvider = ({
  value,
  children,
}: {
  value: UserContextType;
  children: ReactNode;
}) => <userContext.Provider value={value}>{children}</userContext.Provider>;
