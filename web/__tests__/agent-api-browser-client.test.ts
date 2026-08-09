import { afterEach, describe, expect, it, vi } from "vitest";
import { agentApiClient } from "@/lib/api/agent-api";

function mockFetchOnce(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: "OK",
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({}),
    ...response,
  } as Response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("agentApiClient (browser-safe, F0.2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("targets the same-origin BFF proxy path, not a real backend origin", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ status: "ACTIVE" }) });

    await agentApiClient.get("/me");

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/agent/me");
  });

  it("sends credentials: same-origin and the required CSRF header by default", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ id: "1" }) });

    await agentApiClient.post("/listings", { title: "New listing" });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe("same-origin");
    expect(init.headers["X-Requested-With"]).toBe("xhr");
    // Never attaches an Authorization header itself — the BFF proxy attaches
    // the bearer token server-side (F0.2).
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("lets callers override headers/credentials without losing the CSRF header", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({}) });

    await agentApiClient.get("/me", { headers: { "X-Custom": "1" } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers["X-Requested-With"]).toBe("xhr");
    expect(init.headers["X-Custom"]).toBe("1");
  });

  it("does not accept a `token` option at compile time (server-only, per client.ts)", () => {
    type BrowserGetOptions = NonNullable<Parameters<typeof agentApiClient.get>[1]>;
    // @ts-expect-error `token` is omitted from the browser client's option type on purpose.
    const disallowed: BrowserGetOptions = { token: "should-not-compile" };
    expect(disallowed).toBeDefined();
  });
});
