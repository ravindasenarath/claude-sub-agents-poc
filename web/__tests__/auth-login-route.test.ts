import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/login/route";
import { decodePendingAuth } from "@/lib/auth/pending-auth";
import { PENDING_AUTH_COOKIE_NAME } from "@/lib/auth/constants";

function makeRequest(pathWithQuery: string) {
  return new NextRequest(`http://localhost:3000${pathWithQuery}`);
}

describe("GET /api/auth/login (F0.2)", () => {
  it("redirects to the IdP authorize endpoint with PKCE + state params", async () => {
    const response = await GET(makeRequest("/api/auth/login?returnTo=/agent/listings"));
    expect(response.status).toBe(307);

    const location = new URL(response.headers.get("location")!);
    expect(location.origin).toBe("https://idp.test");
    expect(location.pathname).toBe("/authorize");
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("client_id")).toBe("test-client");
    expect(location.searchParams.get("code_challenge_method")).toBe("S256");
    expect(location.searchParams.get("state")).toBeTruthy();
    expect(location.searchParams.get("code_challenge")).toBeTruthy();
  });

  it("stashes state/PKCE verifier/remember/returnTo in the pending-auth cookie", async () => {
    const response = await GET(makeRequest("/api/auth/login?returnTo=/agent/listings&remember=on"));
    const setCookie = response.cookies.get(PENDING_AUTH_COOKIE_NAME);
    expect(setCookie).toBeTruthy();

    const pending = decodePendingAuth(setCookie!.value);
    expect(pending?.remember).toBe(true);
    expect(pending?.returnTo).toBe("/agent/listings");
    expect(pending?.codeVerifier).toBeTruthy();

    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("state")).toBe(pending?.state);
  });

  it("defaults remember to false and returnTo to /agent when not provided", async () => {
    const response = await GET(makeRequest("/api/auth/login"));
    const pending = decodePendingAuth(response.cookies.get(PENDING_AUTH_COOKIE_NAME)!.value);
    expect(pending?.remember).toBe(false);
    expect(pending?.returnTo).toBe("/agent");
  });

  it("rejects an absolute/protocol-relative returnTo (open-redirect guard)", async () => {
    const response = await GET(makeRequest("/api/auth/login?returnTo=https://evil.example"));
    const pending = decodePendingAuth(response.cookies.get(PENDING_AUTH_COOKIE_NAME)!.value);
    expect(pending?.returnTo).toBe("/agent");
  });

  it("adds the hosted-signup hint param when signup=1", async () => {
    const response = await GET(makeRequest("/api/auth/login?signup=1"));
    const location = new URL(response.headers.get("location")!);
    expect(location.searchParams.get("screen_hint")).toBe("signup");
  });
});
