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
