import { createApiClient } from "./client";
import { apiConfig } from "./config";

/**
 * Client bound to the backend's `public-api` surface (unauthenticated read
 * endpoints — search results, listing detail; module-boundaries.md). Safe to
 * call from both Server Components (SSR) and client components; never send
 * a bearer token through this client.
 */
export const publicApiClient = createApiClient(apiConfig.publicApiBaseUrl);
