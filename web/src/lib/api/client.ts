import { ApiError } from "./errors";

export type ApiQuery = Record<string, string | number | boolean | undefined>;

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "method"> {
  /** Query string params; `undefined` values are omitted. */
  query?: ApiQuery;
  /** JSON-serializable request body. */
  body?: unknown;
  /**
   * Bearer token for `agent-api` requests. Auth/session wiring lands in
   * F0.2 — until then, callers that need an authenticated request must pass
   * a token explicitly.
   */
  token?: string;
}

function buildUrl(baseUrl: string, path: string, query?: ApiQuery): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(path.replace(/^\//, ""), normalizedBase);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text.length > 0 ? text : undefined;
}

async function request<T>(
  baseUrl: string,
  method: string,
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { query, body, token, headers, ...rest } = options;

  const response = await fetch(buildUrl(baseUrl, path, query), {
    ...rest,
    method,
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const parsed = await parseBody(response);

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, parsed);
  }

  return parsed as T;
}

/**
 * A small fetch wrapper bound to a single API base URL. Used to build the
 * `publicApiClient` / `agentApiClient` singletons (see `public-api.ts` /
 * `agent-api.ts`) — prefer those over calling this factory directly.
 */
export function createApiClient(baseUrl: string) {
  return {
    get: <T>(path: string, options?: ApiRequestOptions) =>
      request<T>(baseUrl, "GET", path, options),
    post: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
      request<T>(baseUrl, "POST", path, { ...options, body }),
    put: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
      request<T>(baseUrl, "PUT", path, { ...options, body }),
    patch: <T>(path: string, body?: unknown, options?: ApiRequestOptions) =>
      request<T>(baseUrl, "PATCH", path, { ...options, body }),
    delete: <T>(path: string, options?: ApiRequestOptions) =>
      request<T>(baseUrl, "DELETE", path, options),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
