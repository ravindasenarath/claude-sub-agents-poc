import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { hasCsrfHeader, isSameOriginRequest, passesCsrfChecks } from "@/lib/auth/csrf";

function makeRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost:3000/api/agent/listings", {
    method: "POST",
    headers,
  });
}

describe("CSRF checks (F0.2 BFF proxy)", () => {
  it("isSameOriginRequest: true for Sec-Fetch-Site: same-origin", () => {
    expect(isSameOriginRequest(makeRequest({ "sec-fetch-site": "same-origin" }))).toBe(true);
  });

  it("isSameOriginRequest: true for Sec-Fetch-Site: none (e.g. typed-in URL)", () => {
    expect(isSameOriginRequest(makeRequest({ "sec-fetch-site": "none" }))).toBe(true);
  });

  it("isSameOriginRequest: false for Sec-Fetch-Site: cross-site", () => {
    expect(isSameOriginRequest(makeRequest({ "sec-fetch-site": "cross-site" }))).toBe(false);
  });

  it("isSameOriginRequest: falls back to Origin when Sec-Fetch-Site is absent", () => {
    expect(isSameOriginRequest(makeRequest({ origin: "http://localhost:3000" }))).toBe(true);
    expect(isSameOriginRequest(makeRequest({ origin: "https://evil.example" }))).toBe(false);
  });

  it("hasCsrfHeader: requires the exact X-Requested-With: xhr value", () => {
    expect(hasCsrfHeader(makeRequest({ "x-requested-with": "xhr" }))).toBe(true);
    expect(hasCsrfHeader(makeRequest({ "x-requested-with": "XMLHttpRequest" }))).toBe(false);
    expect(hasCsrfHeader(makeRequest())).toBe(false);
  });

  it("passesCsrfChecks: requires both same-origin and the CSRF header", () => {
    expect(
      passesCsrfChecks(makeRequest({ "sec-fetch-site": "same-origin", "x-requested-with": "xhr" })),
    ).toBe(true);
    expect(passesCsrfChecks(makeRequest({ "sec-fetch-site": "same-origin" }))).toBe(false);
    expect(
      passesCsrfChecks(makeRequest({ "sec-fetch-site": "cross-site", "x-requested-with": "xhr" })),
    ).toBe(false);
  });
});
