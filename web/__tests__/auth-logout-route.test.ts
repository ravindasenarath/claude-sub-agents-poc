import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/logout/route";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/auth/logout", {
    method: "POST",
    headers,
  });
}

describe("POST /api/auth/logout (F0.2)", () => {
  it("clears the session cookie on a same-origin request with the required CSRF header", async () => {
    const response = await POST(
      makeRequest({ "sec-fetch-site": "same-origin", "x-requested-with": "xhr" }),
    );
    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSION_COOKIE_NAME)?.value).toBe("");
  });

  it("rejects a cross-site logout request", async () => {
    const response = await POST(
      makeRequest({ "sec-fetch-site": "cross-site", "x-requested-with": "xhr" }),
    );
    expect(response.status).toBe(403);
  });

  it("rejects a same-origin logout request missing the required CSRF header (B4 — same strength as the BFF proxy)", async () => {
    const response = await POST(makeRequest({ "sec-fetch-site": "same-origin" }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ code: "CSRF_REJECTED" });
  });

  it("rejects a request with neither Sec-Fetch-Site/Origin nor the CSRF header (previously allowed by same-origin-only check)", async () => {
    const response = await POST(makeRequest());
    expect(response.status).toBe(403);
  });
});
