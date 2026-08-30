import { NextResponse } from "next/server";
import { auth } from "@/auth";

/**
 * Bounces anonymous traffic to /login. This is a convenience so pages redirect
 * cleanly — it is NOT the security boundary. Every server component and server
 * action re-checks the session itself via requireViewer().
 */
export default auth((req) => {
  const signedIn = !!req.auth?.user?.id;
  const { pathname } = req.nextUrl;

  if (!signedIn && pathname !== "/login") {
    const url = new URL("/login", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Everything except Next internals, the auth endpoints, the cron
    // endpoint (its own CRON_SECRET check — no session, since schedulers
    // can't log in) and static files.
    "/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico|logo-mark.svg|logo.png).*)",
  ],
};
