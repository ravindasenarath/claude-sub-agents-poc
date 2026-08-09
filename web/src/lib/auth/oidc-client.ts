import "server-only";
import { authConfig } from "./config";

/**
 * Minimal, hand-rolled Authorization Code + PKCE OIDC client — no
 * vendor-specific SDK, since the actual IdP is still undecided (ADR-0002
 * revisit triggers). Deliberately kept to the handful of standard OIDC/OAuth2
 * HTTP calls this app needs (discovery, authorize URL, code exchange, token
 * refresh) rather than pulling in a general-purpose client library, matching
 * this codebase's existing minimal-dependency style (see `web/README.md`).
 */

interface DiscoveryDocument {
  authorization_endpoint: string;
  token_endpoint: string;
}

let discoveryCache: { document: DiscoveryDocument; fetchedAt: number } | null = null;
const DISCOVERY_CACHE_TTL_MS = 10 * 60_000;

async function getDiscoveryDocument(): Promise<DiscoveryDocument> {
  if (authConfig.authorizationEndpoint && authConfig.tokenEndpoint) {
    return {
      authorization_endpoint: authConfig.authorizationEndpoint,
      token_endpoint: authConfig.tokenEndpoint,
    };
  }

  if (discoveryCache && Date.now() - discoveryCache.fetchedAt < DISCOVERY_CACHE_TTL_MS) {
    return discoveryCache.document;
  }

  const response = await fetch(
    `${authConfig.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`,
  );
  if (!response.ok) {
    throw new Error(`OIDC discovery request failed: ${response.status}`);
  }
  const document = (await response.json()) as DiscoveryDocument;
  discoveryCache = { document, fetchedAt: Date.now() };
  return document;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  /** Seconds until the access token expires. */
  expiresIn: number;
  idToken?: string;
  /** OIDC subject (`sub`) claim, used to key/provision the local `agent` record (ADR-0002). */
  sub: string;
}

/**
 * Decodes the `sub` claim out of an id_token's payload segment without
 * verifying its signature.
 *
 * This is a deliberate, scoped trust decision, not an oversight: the
 * id_token is obtained here over the back-channel token endpoint call
 * (server-to-server, TLS, with `state`/PKCE already having validated the
 * front-channel redirect) rather than received via a front-channel/implicit
 * redirect, which is the scenario local signature verification primarily
 * guards against. That said, full production hardening should still verify
 * the id_token signature against the IdP's JWKS (`iss`/`aud`/`exp`/`nbf`) —
 * flagging this as a follow-up once a concrete IdP (and therefore a JWKS
 * verification library choice) is picked; see ADR-0002 revisit triggers.
 */
function decodeSubClaim(idToken: string | undefined): string {
  if (!idToken) return "";
  const segments = idToken.split(".");
  if (segments.length < 2) return "";
  try {
    const payload = JSON.parse(Buffer.from(segments[1], "base64url").toString("utf8")) as {
      sub?: string;
    };
    return payload.sub ?? "";
  } catch {
    return "";
  }
}

function parseTokenResponse(json: Record<string, unknown>): TokenResponse {
  const idToken = typeof json.id_token === "string" ? json.id_token : undefined;
  return {
    accessToken: String(json.access_token ?? ""),
    refreshToken: typeof json.refresh_token === "string" ? json.refresh_token : undefined,
    expiresIn: typeof json.expires_in === "number" ? json.expires_in : 300,
    idToken,
    sub: decodeSubClaim(idToken),
  };
}

/** Builds the `/authorize` redirect URL for the login flow (Authorization Code + PKCE). */
export async function buildAuthorizationUrl(params: {
  state: string;
  codeChallenge: string;
  extraParams?: Record<string, string>;
}): Promise<string> {
  const discovery = await getDiscoveryDocument();
  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", authConfig.clientId);
  url.searchParams.set("redirect_uri", authConfig.redirectUri);
  url.searchParams.set("scope", authConfig.scopes);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  for (const [key, value] of Object.entries(params.extraParams ?? {})) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * Extra `/authorize` query params for the "Create account" link on the login
 * page (F0.2 scope — no in-app signup form). Deep-links to the IdP's hosted
 * signup screen instead of login via a config-driven param/value (e.g.
 * Auth0's `screen_hint=signup`) since the concrete IdP isn't chosen yet. This
 * still goes through the normal `/api/auth/login` → `/api/auth/callback`
 * round trip (see `login/route.ts`'s `signup` query flag) so state/PKCE
 * verification stays uniform for both login and signup.
 */
export function signupExtraParams(): Record<string, string> {
  return { [authConfig.signupParam]: authConfig.signupParamValue };
}

export async function exchangeCodeForTokens(params: {
  code: string;
  codeVerifier: string;
}): Promise<TokenResponse> {
  const discovery = await getDiscoveryDocument();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: params.code,
    redirect_uri: authConfig.redirectUri,
    client_id: authConfig.clientId,
    code_verifier: params.codeVerifier,
  });
  if (authConfig.clientSecret) body.set("client_secret", authConfig.clientSecret);

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`OIDC token exchange failed: ${response.status}`);
  }
  return parseTokenResponse((await response.json()) as Record<string, unknown>);
}

export async function refreshTokens(params: { refreshToken: string }): Promise<TokenResponse> {
  const discovery = await getDiscoveryDocument();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: params.refreshToken,
    client_id: authConfig.clientId,
  });
  if (authConfig.clientSecret) body.set("client_secret", authConfig.clientSecret);

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`OIDC token refresh failed: ${response.status}`);
  }
  return parseTokenResponse((await response.json()) as Record<string, unknown>);
}

/** Exposed for tests that want to assert discovery caching/reset between cases. */
export function __resetDiscoveryCacheForTests(): void {
  discoveryCache = null;
}
