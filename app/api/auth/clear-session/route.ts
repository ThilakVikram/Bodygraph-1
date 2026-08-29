import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { destroySession } from "@/lib/auth/session";

/**
 * Clears a stale/invalid session cookie. Route Handlers (unlike Server
 * Component renders) are allowed to mutate cookies, so this is where
 * requireUser() sends unauthenticated requests that still carry a session
 * cookie — otherwise proxy.ts's cookie-presence check keeps bouncing the
 * request between /login and the protected page (ERR_TOO_MANY_REDIRECTS).
 */
export async function GET(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url));
}
