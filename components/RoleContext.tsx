"use client";

import React, { createContext, useContext } from "react";
import type { UserRole } from "@prisma/client";

export type AppRole = UserRole;

export type CurrentUser = {
  id: string;
  name: string;
  role: AppRole;
};

/**
 * The signed-in user, passed down from the server so client components can
 * decide what to *show*.
 *
 * Read-only by design: there is deliberately no setter. The role comes from the
 * session and nothing in the browser may change it. This is presentation only —
 * what a user may actually *do* is enforced in app/actions.ts against
 * lib/permissions, and hiding a control here grants nothing on its own.
 */
const RoleContext = createContext<CurrentUser>({
  id: "",
  name: "",
  role: "MEMBER",
});

export function RoleProvider({
  viewer,
  children,
}: {
  viewer: CurrentUser;
  children: React.ReactNode;
}) {
  return <RoleContext.Provider value={viewer}>{children}</RoleContext.Provider>;
}

export function useRole(): { currentUser: CurrentUser } {
  return { currentUser: useContext(RoleContext) };
}
