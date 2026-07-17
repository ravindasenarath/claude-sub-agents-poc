import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiClient, ApiError } from "@/lib/api";

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

describe("createApiClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a GET request against the given base URL with query params", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ items: [] }) });
    const client = createApiClient("http://localhost:8080/api/public");

    const result = await client.get<{ items: unknown[] }>("/listings", {
      query: { suburb: "Richmond", page: 1, unset: undefined },
    });

    expect(result).toEqual({ items: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8080/api/public/listings?suburb=Richmond&page=1");
    expect(init.method).toBe("GET");
  });

  it("sends a JSON body and Authorization header for authenticated requests", async () => {
    const fetchMock = mockFetchOnce({ json: async () => ({ id: "1" }) });
    const client = createApiClient("http://localhost:8080/api/agent");

    await client.post(
      "/listings",
      { title: "New listing" },
      { token: "test-token" },
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ title: "New listing" }));
    expect(init.headers.Authorization).toBe("Bearer test-token");
    expect(init.headers["Content-Type"]).toBe("application/json");
  });

  it("throws ApiError with parsed body when the response is not ok", async () => {
    mockFetchOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({ message: "Listing not found" }),
    });
    const client = createApiClient("http://localhost:8080/api/public");

    await expect(client.get("/listings/missing")).rejects.toMatchObject({
      status: 404,
      body: { message: "Listing not found" },
    });
    await expect(client.get("/listings/missing")).rejects.toBeInstanceOf(ApiError);
  });

  it("returns undefined for 204 No Content responses", async () => {
    mockFetchOnce({
      status: 204,
      headers: new Headers(),
      json: async () => {
        throw new Error("should not be called");
      },
    });
    const client = createApiClient("http://localhost:8080/api/agent");

    const result = await client.delete("/listings/1", { token: "test-token" });
    expect(result).toBeUndefined();
  });
});
