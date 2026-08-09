import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens } from "@/lib/auth/oidc-client";
import { clearPendingAuthCookie, getPendingAuthFromRequest } from "@/lib/auth/pending-auth";
import { applySessionCookie, createSessionPayload } from "@/lib/auth/session";
import { RETURN_TO_DEFAULT } from "@/lib/auth/constants";

function loginErrorRedirect(request: NextRequest): NextResponse {
  const response = NextResponse.redirect(new URL("/login?error=auth_failed", request.url));
  clearPendingAuthCookie(response);
  return response;
}

/**
 * OIDC callback: verifies `state` against the pre-auth cookie (CSRF
 * protection for the redirect round trip), exchanges the authorization code
 * + PKCE verifier for tokens, creates the encrypted session cookie, and
 * redirects to the originally-requested path.
 */
export async function GET(request: NextRequest) {
  const error = request.nextUrl.searchParams.get("error");
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const pending = getPendingAuthFromRequest(request);

  if (error || !code || !state || !pending || pending.state !== state) {
    return loginErrorRedirect(request);
  }

  try {
    const tokens = await exchangeCodeForTokens({ code, codeVerifier: pending.codeVerifier });
    // `parseTokenResponse`/`decodeSubClaim` (`oidc-client.ts`) coerce a
    // missing `access_token` to `""` and a missing/unparseable `id_token` (or
    // one with no `sub` claim) to an empty `sub`, rather than throwing —
    // deliberately, so a single malformed-response shape doesn't need
    // duplicated validation in both places. Enforce the invariant here
    // instead, before minting a session: an empty access token would strand
    // the agent in a logged-in-but-everything-401s state, and an empty `sub`
    // means there's no OIDC subject to key the session (or, eventually, the
    // local `agent` record) on.
    if (!tokens.accessToken || !tokens.sub) {
      throw new Error("OIDC token response missing access_token or id_token sub claim");
    }
    const session = createSessionPayload({ sub: tokens.sub, tokens, remember: pending.remember });

    const response = NextResponse.redirect(
      new URL(pending.returnTo || RETURN_TO_DEFAULT, request.url),
    );
    applySessionCookie(response, session);
    clearPendingAuthCookie(response);
    return response;
  } catch {
    return loginErrorRedirect(request);
  }
}
