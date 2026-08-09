import "server-only";

/**
 * OIDC + session configuration, sourced entirely from server-only env vars
 * (no `NEXT_PUBLIC_` prefix — none of this belongs in the browser bundle).
 * See `.env.example` for the full list and `docs/architecture/ADR-0002` for
 * why agent auth is delegated to a managed OIDC provider in the first place.
 *
 * The actual IdP is still undecided (ADR-0002 revisit), so:
 *  - `issuer` drives OIDC discovery (`{issuer}/.well-known/openid-configuration`)
 *    by default.
 *  - `authorizationEndpoint`/`tokenEndpoint` can be set directly to skip
 *    discovery entirely (useful for providers without discovery, and for
 *    tests).
 *  - Falls back to local, obviously-fake defaults so `npm run build`/`test`
 *    work without a real IdP configured; every one of these must be
 *    overridden via `.env.local` (or real deployment env vars) before this
 *    app is pointed at a real provider.
 */
/**
 * Intentionally obviously-insecure fallback so local dev/tests work without
 * a `.env.local` — see the `sessionSecret` guard below, which refuses to let
 * this value (or an unset `SESSION_SECRET`) reach production.
 */
const DEV_SESSION_SECRET_PLACEHOLDER = "dev-only-insecure-secret-change-me";

const sessionSecret = process.env.SESSION_SECRET ?? DEV_SESSION_SECRET_PLACEHOLDER;

// Fail closed, not open: a missed `SESSION_SECRET` env var in production
// must never silently fall back to a secret that's committed in this repo's
// `.env.example` — that would make every session cookie forgeable. Checked
// at module load (not lazily) so a misconfigured production deploy fails
// immediately at boot rather than the first time a request needs it.
//
// `next build` itself also runs with `NODE_ENV=production` (that's what
// "production build" means to Next, independent of whether/where it's
// deployed) and imports this module while collecting route metadata, so the
// check is skipped during `NEXT_PHASE=phase-production-build` — otherwise
// `npm run build` would fail in CI/local dev, which never sets a real
// secret. The actual production *server* process (`next start`, or however
// the built output is run) does not set `NEXT_PHASE`, so the guard still
// applies there.
const isProductionBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
if (process.env.NODE_ENV === "production" && !isProductionBuildPhase && sessionSecret === DEV_SESSION_SECRET_PLACEHOLDER) {
  throw new Error(
    "SESSION_SECRET is unset (or still the dev placeholder) in a production build. " +
      "Set it to a real random secret (32+ bytes, e.g. `openssl rand -base64 32`) before " +
      "deploying — see .env.example.",
  );
}

export const authConfig = {
  issuer: process.env.OIDC_ISSUER ?? "https://idp.invalid",
  authorizationEndpoint: process.env.OIDC_AUTHORIZATION_ENDPOINT,
  tokenEndpoint: process.env.OIDC_TOKEN_ENDPOINT,
  clientId: process.env.OIDC_CLIENT_ID ?? "property-listing-web",
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  redirectUri: process.env.OIDC_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback",
  scopes: process.env.OIDC_SCOPES ?? "openid profile email offline_access",
  /**
   * Query param convention used to deep-link to the IdP's hosted signup
   * screen instead of login (e.g. Auth0's `screen_hint=signup`, or a
   * `prompt=create` style param on other providers). Config-driven
   * placeholder per F0.2's scope — pin the real values once an IdP is
   * chosen.
   */
  signupParam: process.env.OIDC_SIGNUP_PARAM ?? "screen_hint",
  signupParamValue: process.env.OIDC_SIGNUP_PARAM_VALUE ?? "signup",
  /**
   * Symmetric secret used to encrypt the session + pre-auth cookies
   * (`crypto.ts`). The fallback is intentionally obviously-insecure so local
   * dev/tests work out of the box; production deploys must set a real,
   * random 32+ byte secret via `SESSION_SECRET` (see the guard above, which
   * refuses to boot in production without one).
   */
  sessionSecret,
} as const;
