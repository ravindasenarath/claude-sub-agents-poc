import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { passesCsrfChecks } from "@/lib/auth/csrf";
import {
  applySessionCookie,
  clearSessionCookie,
  getSessionFromRequest,
  refreshSessionIfNeeded,
} from "@/lib/auth/session";
import { isAgentApiMockEnabled, agentApiServerBaseUrl } from "@/lib/api/server-config";
import { getDevMockAgentMe } from "@/lib/api/agent-me-dev-mock";

/**
 * BFF proxy for all `agent-api` traffic (F0.2 — see docs/architecture/
 * ADR-0002's token-transport amendment and module-boundaries.md). The
 * browser never holds or sees an access/refresh token: it sends only the
 * httpOnly session cookie (same-origin, automatic), and this route attaches
 * `Authorization: Bearer <token>` server-side before forwarding to the real
 * backend `agent-api` origin.
 *
 * - Non-GET requests must pass both CSRF checks (`lib/auth/csrf.ts`) —
 *   reintroduced by moving the credential from a header to a cookie.
 * - No/expired session → `401 { code: "NO_SESSION" }` (not a redirect: the
 *   caller here is `fetch`, not a browser navigation — navigations to
 *   `/agent/*` itself are guarded by `proxy.ts`).
 * - Forwards method, query string, body, and an allowlisted subset of
 *   request headers unchanged, and streams the backend's response back
 *   unchanged.
 * - Each path segment is validated (`isSafePathSegment`) and
 *   percent-encoded before being joined into the forward URL — this is the
 *   hop that attaches the real bearer token, so it must not trust WHATWG
 *   `URL`'s `..`-normalization as its only defense against escaping the
 *   backend's intended path prefix.
 * - A failed sliding-renewal refresh (revoked/expired refresh token, IdP
 *   outage) is treated as "no session" (`401 NO_SESSION` + cleared cookie),
 *   not a raw 500.
 */

// Explicit allowlist of browser-supplied headers forwarded to the backend.
// Deliberately an allowlist, not a denylist: this is the hop that attaches
// the real bearer token, so anything not known-safe to forward (e.g.
// `x-forwarded-for`/`x-real-ip`/`forwarded`, fully attacker-controlled via
// `fetch`) must be dropped by default rather than passed through unless
// explicitly excluded.
const FORWARDED_REQUEST_HEADERS = new Set(["content-type", "accept", "accept-language"]);
const STRIPPED_RESPONSE_HEADERS = new Set(["set-cookie", "content-encoding", "content-length", "connection"]);

function buildForwardHeaders(request: NextRequest, accessToken: string): Headers {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (FORWARDED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  headers.set("authorization", `Bearer ${accessToken}`);
  return headers;
}

/** Rejects path traversal / segment-smuggling attempts before they reach the credential-attaching fetch below. */
function isSafePathSegment(segment: string): boolean {
  return segment !== ".." && segment !== "." && !segment.includes("/");
}

function buildResponseHeaders(backendResponse: Response): Headers {
  const headers = new Headers();
  for (const [key, value] of backendResponse.headers.entries()) {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  return headers;
}

async function handle(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> },
): Promise<NextResponse> {
  if (request.method !== "GET" && !passesCsrfChecks(request)) {
    return NextResponse.json({ code: "CSRF_REJECTED" }, { status: 403 });
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ code: "NO_SESSION" }, { status: 401 });
  }

  const { path } = await params;
  const segments = path ?? [];
  if (!segments.every(isSafePathSegment)) {
    return NextResponse.json({ code: "INVALID_PATH" }, { status: 400 });
  }
  const targetPath = `/${segments.map(encodeURIComponent).join("/")}`;

  let freshSession: typeof session;
  let cookieUpdate: Awaited<ReturnType<typeof refreshSessionIfNeeded>>["cookieUpdate"];
  try {
    ({ session: freshSession, cookieUpdate } = await refreshSessionIfNeeded(session));
  } catch {
    // A revoked/rotated refresh token, IdP outage, or an empty stored
    // refresh token (see `session.ts`'s `refreshToken ?? ""` default) all
    // surface here. Treat it the same as "no session" — clearing the cookie
    // and returning the same `401 NO_SESSION` shape the client already
    // redirects to `/login` on — rather than letting the throw become a raw
    // 500 that wedges a "remember me" user for up to 30 days.
    const response = NextResponse.json({ code: "NO_SESSION" }, { status: 401 });
    clearSessionCookie(response);
    return response;
  }

  if (isAgentApiMockEnabled() && targetPath === "/me" && request.method === "GET") {
    const response = NextResponse.json(getDevMockAgentMe());
    if (cookieUpdate) applySessionCookie(response, cookieUpdate);
    return response;
  }

  const targetUrl = new URL(agentApiServerBaseUrl.replace(/\/$/, "") + targetPath);
  targetUrl.search = request.nextUrl.search;

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const backendResponse = await fetch(targetUrl, {
    method: request.method,
    headers: buildForwardHeaders(request, freshSession.accessToken),
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const response = new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    statusText: backendResponse.statusText,
    headers: buildResponseHeaders(backendResponse),
  });
  if (cookieUpdate) applySessionCookie(response, cookieUpdate);
  return response;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
