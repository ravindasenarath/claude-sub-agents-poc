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
   * (`crypto.ts`). The fallback is intentionally obviously-insecure so
   * local dev/tests work out of the box; production deploys must set a real
   * secret via `SESSION_SECRET`.
   */
  sessionSecret: process.env.SESSION_SECRET ?? "dev-only-insecure-secret-change-me",
} as const;
