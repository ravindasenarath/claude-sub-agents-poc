import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/callback/route";
import { encodePendingAuth } from "@/lib/auth/pending-auth";
import { decodeSession } from "@/lib/auth/session";
import { PENDING_AUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth/constants";

function makeRequest(pathWithQuery: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${pathWithQuery}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function pendingCookie(overrides: Partial<{ state: string; remember: boolean; returnTo: string }> = {}) {
  const value = encodePendingAuth({
    state: overrides.state ?? "state-1",
    codeVerifier: "verifier-1",
    remember: overrides.remember ?? false,
    returnTo: overrides.returnTo ?? "/agent",
    createdAt: Date.now(),
  });
  return `${PENDING_AUTH_COOKIE_NAME}=${value}`;
}

function fakeIdToken(sub: string): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub })).toString("base64url");
  return `${header}.${payload}.`;
}

describe("GET /api/auth/callback (F0.2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exchanges the code for tokens and sets an encrypted session cookie, then redirects to returnTo", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "access-1",
        refresh_token: "refresh-1",
        expires_in: 300,
        id_token: fakeIdToken("auth0|agent-1"),
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      makeRequest(
        "/api/auth/callback?code=abc&state=state-1",
        pendingCookie({ state: "state-1", returnTo: "/agent/listings" }),
      ),
    );

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/agent/listings");

    const sessionCookie = response.cookies.get(SESSION_COOKIE_NAME);
    expect(sessionCookie).toBeTruthy();
    const session = decodeSession(sessionCookie!.value);
    expect(session?.accessToken).toBe("access-1");
    expect(session?.sub).toBe("auth0|agent-1");

    // The pending-auth cookie must be cleared after a successful callback.
    expect(response.cookies.get(PENDING_AUTH_COOKIE_NAME)?.value).toBe("");
  });

  it("redirects to /login?error=auth_failed when state doesn't match the pending cookie", async () => {
    const response = await GET(
      makeRequest("/api/auth/callback?code=abc&state=wrong", pendingCookie({ state: "state-1" })),
    );
    expect(new URL(response.headers.get("location")!).pathname + new URL(response.headers.get("location")!).search).toContain(
      "/login",
    );
    expect(response.cookies.get(SESSION_COOKIE_NAME)).toBeFalsy();
  });

  it("redirects to /login?error=auth_failed when there's no pending-auth cookie at all", async () => {
    const response = await GET(makeRequest("/api/auth/callback?code=abc&state=state-1"));
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
  });

  it("redirects to /login?error=auth_failed when the IdP reports an error", async () => {
    const response = await GET(
      makeRequest("/api/auth/callback?error=access_denied", pendingCookie()),
    );
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
  });

  it("redirects to /login?error=auth_failed when the token exchange fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 400 }));
    const response = await GET(
      makeRequest("/api/auth/callback?code=abc&state=state-1", pendingCookie({ state: "state-1" })),
    );
    expect(new URL(response.headers.get("location")!).searchParams.get("error")).toBe("auth_failed");
  });
});
