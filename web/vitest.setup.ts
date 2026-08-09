import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// `vitest.config.mts` doesn't set `test.globals: true` (existing
// convention: test files import `describe`/`it`/`expect` explicitly), so
// React Testing Library's usual auto-registered `afterEach(cleanup)` never
// finds a global `afterEach` to hook into. Register it explicitly instead,
// otherwise components rendered in one test (or one `rerender`) leak into
// the next within the same file.
afterEach(() => {
  cleanup();
});

// Deterministic OIDC/session config for tests (F0.2) — set before any test
// file imports the modules that read these at module-load time
// (src/lib/auth/config.ts). Skips real OIDC discovery by pointing directly
// at fake authorize/token endpoints; individual tests mock `fetch` for any
// actual network call.
process.env.OIDC_ISSUER ??= "https://idp.test";
process.env.OIDC_AUTHORIZATION_ENDPOINT ??= "https://idp.test/authorize";
process.env.OIDC_TOKEN_ENDPOINT ??= "https://idp.test/token";
process.env.OIDC_CLIENT_ID ??= "test-client";
process.env.OIDC_REDIRECT_URI ??= "http://localhost:3000/api/auth/callback";
process.env.SESSION_SECRET ??= "test-session-secret";
process.env.AGENT_API_BASE_URL ??= "http://localhost:8080/api/agent";
