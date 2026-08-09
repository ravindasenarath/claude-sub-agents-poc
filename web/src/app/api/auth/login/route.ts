import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl, signupExtraParams } from "@/lib/auth/oidc-client";
import { createCodeChallenge, createCodeVerifier, createState } from "@/lib/auth/pkce";
import { applyPendingAuthCookie } from "@/lib/auth/pending-auth";
import { RETURN_TO_DEFAULT } from "@/lib/auth/constants";

/** Only ever redirect back into this app — never follow an attacker-supplied absolute/protocol-relative URL. */
function sanitizeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return RETURN_TO_DEFAULT;
  return raw;
}

/**
 * Starts the Authorization Code + PKCE flow: generates `state` + PKCE
 * verifier/challenge, stashes them (plus the "remember me" choice and the
 * originally-requested path) in a short-lived encrypted cookie, and redirects
 * to the IdP's `/authorize` endpoint.
 *
 * Query params:
 *  - `returnTo` — path to return to after login (defaults to `/agent`).
 *  - `remember` — `"on"`/`"true"` for the persistent/~30d session.
 *  - `signup` — `"1"` to deep-link to the IdP's hosted signup screen instead
 *    of login (the login page's "Create account" link).
 */
export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const rememberParam = request.nextUrl.searchParams.get("remember");
  const remember = rememberParam === "on" || rememberParam === "true";
  const isSignup = request.nextUrl.searchParams.get("signup") === "1";

  const state = createState();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);

  const authorizationUrl = await buildAuthorizationUrl({
    state,
    codeChallenge,
    extraParams: isSignup ? signupExtraParams() : undefined,
  });

  const response = NextResponse.redirect(authorizationUrl);
  applyPendingAuthCookie(response, {
    state,
    codeVerifier,
    remember,
    returnTo,
    createdAt: Date.now(),
  });
  return response;
}
