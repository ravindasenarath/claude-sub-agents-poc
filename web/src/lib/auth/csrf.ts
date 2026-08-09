import "server-only";
import type { NextRequest } from "next/server";

/**
 * Moving the browser-facing credential from an `Authorization` header (which
 * cross-site requests can't set) to a cookie (which the browser attaches
 * automatically) reintroduces CSRF for the BFF proxy — bearer tokens were
 * immune to this. Two independent defenses, both required for non-GET
 * requests:
 *  1. `Origin`/`Sec-Fetch-Site` must indicate a same-origin request.
 *  2. A custom header must be present that a cross-site `<form>` or plain
 *     `<script>` request can't set without triggering a CORS preflight the
 *     browser would then block (since we don't send back CORS-allow headers
 *     for cross-origin callers).
 */
const REQUIRED_CSRF_HEADER = "x-requested-with";
const REQUIRED_CSRF_HEADER_VALUE = "xhr";

export function isSameOriginRequest(request: NextRequest): boolean {
  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite) {
    return secFetchSite === "same-origin" || secFetchSite === "none";
  }

  // Older browsers / non-fetch clients may not send Sec-Fetch-Site. Fall
  // back to Origin when present; a same-origin `fetch`/form submission
  // always sends one for non-GET requests.
  const origin = request.headers.get("origin");
  if (origin) {
    return origin === request.nextUrl.origin;
  }

  // Neither header present: rely on `hasCsrfHeader` as the primary defense
  // for this request instead of failing closed here (some legitimate
  // same-origin server-to-server/test clients omit both).
  return true;
}

export function hasCsrfHeader(request: NextRequest): boolean {
  return request.headers.get(REQUIRED_CSRF_HEADER)?.toLowerCase() === REQUIRED_CSRF_HEADER_VALUE;
}

/** Both checks must pass for a non-GET request to the BFF proxy. */
export function passesCsrfChecks(request: NextRequest): boolean {
  return isSameOriginRequest(request) && hasCsrfHeader(request);
}
