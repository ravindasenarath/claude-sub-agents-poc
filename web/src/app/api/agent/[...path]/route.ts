import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { passesCsrfChecks } from "@/lib/auth/csrf";
import { applySessionCookie, getSessionFromRequest, refreshSessionIfNeeded } from "@/lib/auth/session";
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
 * - Forwards method, query string, body, and content-type unchanged, and
 *   streams the backend's response back unchanged.
 */

// Headers that must never be forwarded as-is between hops.
const STRIPPED_REQUEST_HEADERS = new Set(["cookie", "host", "content-length", "connection"]);
const STRIPPED_RESPONSE_HEADERS = new Set(["set-cookie", "content-encoding", "content-length", "connection"]);

function buildForwardHeaders(request: NextRequest, accessToken: string): Headers {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (!STRIPPED_REQUEST_HEADERS.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  }
  headers.set("authorization", `Bearer ${accessToken}`);
  return headers;
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

  const { session: freshSession, cookieUpdate } = await refreshSessionIfNeeded(session);

  const { path } = await params;
  const targetPath = `/${(path ?? []).join("/")}`;

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
