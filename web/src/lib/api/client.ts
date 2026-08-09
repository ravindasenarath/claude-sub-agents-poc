import { ApiError } from "./errors";

export type ApiQuery = Record<string, string | number | boolean | undefined>;

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "method"> {
  /** Query string params; `undefined` values are omitted. */
  query?: ApiQuery;
  /** JSON-serializable request body. */
  body?: unknown;
  /**
   * Bearer token to attach as `Authorization: Bearer <token>`.
   *
   * Server-only, as of F0.2: the browser never holds an agent-api access
   * token (see docs/architecture/ADR-0002's token-transport amendment and
   * module-boundaries.md — the Next server is a BFF proxy for all
   * `agent-api` traffic). This option exists for the BFF proxy route itself
   * (`app/api/agent/[...path]/route.ts`) and for Server Components that call
   * the backend directly via `lib/api/agent-api.server.ts`. Browser-side
   * callers must never pass this — use `agentApiClient` from
   * `lib/api/agent-api.ts` instead, which relies on the same-origin session
   * cookie plus the CSRF header/credentials the proxy requires.
   */
  token?: string;
}

function appendQueryString(query: ApiQuery | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function buildUrl(baseUrl: string, path: string, query?: ApiQuery): string {
  const normalizedPath = path.replace(/^\//, "");

  if (baseUrl.startsWith("/")) {
    // Relative base (the same-origin BFF path, e.g. "/api/agent" — see
    // `config.ts`). `new URL()` requires an absolute base and throws on a
    // relative one, so build the string directly instead; this also keeps
    // the request same-origin regardless of how/where the app is hosted,
    // rather than resolving against a guessed origin.
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return `${normalizedBase}${normalizedPath}${appendQueryString(query)}`;
  }

  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  const url = new URL(normalizedPath, normalizedBase);
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
