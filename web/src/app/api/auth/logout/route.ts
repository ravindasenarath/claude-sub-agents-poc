import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { isSameOriginRequest } from "@/lib/auth/csrf";

/**
 * Clears the session cookie. `POST`-only (a state-changing request), guarded
 * by the same same-origin check the BFF proxy uses for non-GET requests —
 * see `lib/auth/csrf.ts`.
 */
export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
