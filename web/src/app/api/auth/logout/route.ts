import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { passesCsrfChecks } from "@/lib/auth/csrf";

/**
 * Clears the session cookie. `POST`-only (a state-changing request), guarded
 * by the same two-check CSRF defense the BFF proxy uses for non-GET requests
 * (`lib/auth/csrf.ts`'s `passesCsrfChecks`) — same-origin check alone
 * (`isSameOriginRequest`) is only safe when paired with the mandatory custom
 * header, since it falls back to `true` when both `Sec-Fetch-Site` and
 * `Origin` are absent. `LogoutButton` already sends the required header.
 */
export async function POST(request: NextRequest) {
  if (!passesCsrfChecks(request)) {
    return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
