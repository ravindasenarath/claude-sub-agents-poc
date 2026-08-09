import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";

/**
 * Route guard for the agent (authenticated) surface (F0.2). Next.js 16's
 * replacement for `middleware.ts` — see `app/agent/layout.tsx`. Runs on the
 * Node.js runtime by default in this Next version, so it can use the same
 * `lib/auth/session.ts` (AES-256-GCM via `node:crypto`) as the BFF proxy
 * route and auth routes rather than a separate Edge-safe implementation.
 *
 * Unauthenticated (missing/expired session) navigation to `/agent` or any
 * `/agent/<path>` redirects to `/login`, carrying the originally-requested
 * path so login can return there afterwards.
 */
export function proxy(request: NextRequest) {
  const session = getSessionFromRequest(request);
  if (session) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("returnTo", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: "/agent/:path*",
};
