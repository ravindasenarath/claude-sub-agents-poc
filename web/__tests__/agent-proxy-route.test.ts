import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/agent/[...path]/route";
import { createSessionPayload, encodeSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

function sessionCookie(overrides: Partial<{ remember: boolean; expiresIn: number }> = {}) {
  const session = createSessionPayload({
    sub: "sub-1",
    tokens: {
      accessToken: "live-access-token",
      refreshToken: "live-refresh-token",
      expiresIn: overrides.expiresIn ?? 3600,
      sub: "sub-1",
    },
    remember: overrides.remember ?? true,
  });
  return `${SESSION_COOKIE_NAME}=${encodeSession(session)}`;
}

function makeRequest(
  method: string,
  pathWithQuery: string,
  { cookie, headers = {}, body }: { cookie?: string; headers?: Record<string, string>; body?: unknown } = {},
) {
  return new NextRequest(`http://localhost:3000${pathWithQuery}`, {
    method,
    headers: {
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function callRoute(
  handler: typeof GET,
  request: NextRequest,
  path: string[],
) {
  return handler(request, { params: Promise.resolve({ path }) });
}

describe("BFF agent proxy route (F0.2)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.AGENT_API_MOCK = "false";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("returns 401 NO_SESSION when there's no session cookie", async () => {
    const response = await callRoute(GET, makeRequest("GET", "/api/agent/me"), ["me"]);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "NO_SESSION" });
  });

  it("returns 401 NO_SESSION when the session cookie is expired/garbage", async () => {
    const response = await callRoute(
      GET,
      makeRequest("GET", "/api/agent/me", { cookie: `${SESSION_COOKIE_NAME}=garbage` }),
      ["me"],
    );
    expect(response.status).toBe(401);
  });

  it("rejects a cross-site POST (CSRF) even with a valid session", async () => {
    const response = await callRoute(
      POST,
      makeRequest("POST", "/api/agent/listings", {
        cookie: sessionCookie(),
        headers: { "sec-fetch-site": "cross-site", "x-requested-with": "xhr" },
      }),
      ["listings"],
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "CSRF_REJECTED" });
  });

  it("rejects a same-origin POST missing the required CSRF header", async () => {
    const response = await callRoute(
      POST,
      makeRequest("POST", "/api/agent/listings", {
        cookie: sessionCookie(),
        headers: { "sec-fetch-site": "same-origin" },
      }),
      ["listings"],
    );
    expect(response.status).toBe(403);
  });

  it("forwards a GET request's method/query and attaches the bearer token server-side", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await callRoute(
      GET,
      makeRequest("GET", "/api/agent/listings?mine=true", { cookie: sessionCookie() }),
      ["listings"],
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [targetUrl, init] = fetchMock.mock.calls[0];
    expect(String(targetUrl)).toBe("http://localhost:8080/api/agent/listings?mine=true");
    expect(init.method).toBe("GET");
    expect(init.headers.get("authorization")).toBe("Bearer live-access-token");
    // The browser's own cookie must never be forwarded to the backend.
    expect(init.headers.get("cookie")).toBeNull();
  });

  it("forwards a POST body + content-type and passes CSRF checks", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await callRoute(
      POST,
      makeRequest("POST", "/api/agent/listings", {
        cookie: sessionCookie(),
        headers: {
          "sec-fetch-site": "same-origin",
          "x-requested-with": "xhr",
          "content-type": "application/json",
        },
        body: { title: "New listing" },
      }),
      ["listings"],
    );

    expect(response.status).toBe(204);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.headers.get("content-type")).toBe("application/json");
    expect(new TextDecoder().decode(init.body as ArrayBuffer)).toBe(JSON.stringify({ title: "New listing" }));
  });

  it("serves the dev-mock GET /api/agent/me without calling fetch when AGENT_API_MOCK=true", async () => {
    process.env.AGENT_API_MOCK = "true";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await callRoute(
      GET,
      makeRequest("GET", "/api/agent/me", { cookie: sessionCookie() }),
      ["me"],
    );

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
    const body = await response.json();
    expect(body.status).toBe("ACTIVE");
    // Never leaks the session's token fields into the response body.
    expect(body.accessToken).toBeUndefined();
    expect(body.refreshToken).toBeUndefined();
  });

  it("rejects a `..` path segment instead of forwarding it (path escape / B1)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await callRoute(
      GET,
      makeRequest("GET", "/api/agent/actuator/health", { cookie: sessionCookie() }),
      ["..", "..", "actuator", "health"],
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ code: "INVALID_PATH" });
    // Never even reaches the point of attaching the bearer token / calling fetch.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a path segment containing a literal `/` instead of forwarding it (B1)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    // A segment array element containing its own `/` (e.g. from an
    // upstream decode of a `%2F`) would otherwise let a single "safe"
    // segment smuggle extra path structure past a naive join.
    const response = await callRoute(
      GET,
      makeRequest("GET", "/api/agent/listings", { cookie: sessionCookie() }),
      ["listings", "../../actuator"],
    );

    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("percent-encodes forwarded path segments", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await callRoute(
      GET,
      makeRequest("GET", "/api/agent/listings/weird%20id", { cookie: sessionCookie() }),
      ["listings", "weird id"],
    );

    const [targetUrl] = fetchMock.mock.calls[0];
    expect(String(targetUrl)).toBe("http://localhost:8080/api/agent/listings/weird%20id");
  });

  it("returns 401 NO_SESSION (and clears the cookie) instead of a raw 500 when the refresh call fails (B2)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("OIDC token refresh failed: 400"));
    vi.stubGlobal("fetch", fetchMock);

    // Force a refresh: the default `sessionCookie()` uses a long `expiresIn`,
    // so build one whose access token is already past the refresh window.
    const response = await callRoute(
      GET,
      makeRequest("GET", "/api/agent/listings", { cookie: sessionCookie({ expiresIn: -1 }) }),
      ["listings"],
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ code: "NO_SESSION" });
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");
  });

  it("only forwards allowlisted request headers, dropping spoofable ones like X-Forwarded-For (B5)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await callRoute(
      GET,
      makeRequest("GET", "/api/agent/listings", {
        cookie: sessionCookie(),
        headers: {
          "x-forwarded-for": "1.2.3.4",
          "x-real-ip": "1.2.3.4",
          forwarded: "for=1.2.3.4",
          "content-type": "application/json",
        },
      }),
      ["listings"],
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.get("x-forwarded-for")).toBeNull();
    expect(init.headers.get("x-real-ip")).toBeNull();
    expect(init.headers.get("forwarded")).toBeNull();
    expect(init.headers.get("content-type")).toBe("application/json");
  });
});
