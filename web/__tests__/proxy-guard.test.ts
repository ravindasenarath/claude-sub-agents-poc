import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy, config } from "@/proxy";
import { createSessionPayload, encodeSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

function makeRequest(pathWithQuery: string, cookie?: string) {
  return new NextRequest(`http://localhost:3000${pathWithQuery}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("proxy route guard (F0.2)", () => {
  it("matcher only protects /agent/:path*", () => {
    expect(config.matcher).toBe("/agent/:path*");
  });

  it("redirects unauthenticated navigation to /agent to /login with returnTo", () => {
    const response = proxy(makeRequest("/agent"));
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("returnTo")).toBe("/agent");
  });

  it("redirects unauthenticated navigation to a nested /agent path, preserving the full path + query", () => {
    const response = proxy(makeRequest("/agent/listings/123?tab=photos"));
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("returnTo")).toBe("/agent/listings/123?tab=photos");
  });

  it("redirects when the session cookie is present but expired", () => {
    const session = {
      ...createSessionPayload({ sub: "sub-1", tokens: { accessToken: "a", refreshToken: "r", expiresIn: 300, sub: "sub-1" }, remember: true }),
      idleExpiry: Date.now() - 1_000,
    };
    const response = proxy(
      makeRequest("/agent", `${SESSION_COOKIE_NAME}=${encodeSession(session)}`),
    );
    expect(response.status).toBe(307);
  });

  it("redirects when the session cookie is present but tampered/garbage", () => {
    const response = proxy(makeRequest("/agent", `${SESSION_COOKIE_NAME}=garbage`));
    expect(response.status).toBe(307);
  });

  it("lets an authenticated request through (no redirect)", () => {
    const session = createSessionPayload({
      sub: "sub-1",
      tokens: { accessToken: "a", refreshToken: "r", expiresIn: 300, sub: "sub-1" },
      remember: true,
    });
    const response = proxy(
      makeRequest("/agent/listings", `${SESSION_COOKIE_NAME}=${encodeSession(session)}`),
    );
    expect(response.headers.get("location")).toBeNull();
  });
});
