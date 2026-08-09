import "server-only";

/** Name of the encrypted session cookie (see `session.ts`). */
export const SESSION_COOKIE_NAME = "pl_session";

/**
 * Name of the short-lived cookie that carries the OIDC `state`/PKCE
 * `code_verifier`/remember-me choice/return path across the redirect to the
 * IdP and back (see `pending-auth.ts`).
 */
export const PENDING_AUTH_COOKIE_NAME = "pl_oidc_pending";

/** Where to send a signed-in agent when no `returnTo` was requested. */
export const RETURN_TO_DEFAULT = "/agent";

/** Refresh the access token once it's within this long of expiring. */
export const ACCESS_TOKEN_REFRESH_WINDOW_MS = 60_000;

/**
 * Sliding-renewal throttle: re-issuing `Set-Cookie` on every authenticated
 * request would rewrite the cookie constantly. Skip the rewrite (but keep
 * using the still-valid in-memory session for the current request) unless
 * it's been at least this long since the last write, or the access token
 * itself just got refreshed (which always forces a write, since a rotated
 * refresh token has to be persisted immediately).
 */
export const SET_COOKIE_THROTTLE_MS = 5 * 60_000;

/** "Remember me" unchecked: browser-session cookie, ~8h idle timeout. */
export const IDLE_WINDOW_DEFAULT_MS = 8 * 60 * 60_000;

/** "Remember me" checked: ~14d idle timeout, capped by the 30d absolute window below. */
export const IDLE_WINDOW_REMEMBER_MS = 14 * 24 * 60 * 60_000;

/** "Remember me" checked: ~30d absolute cap regardless of activity. */
export const ABSOLUTE_WINDOW_REMEMBER_MS = 30 * 24 * 60 * 60_000;

/** How long the pre-auth (state/PKCE) cookie is valid for before the round trip must complete. */
export const PENDING_AUTH_MAX_AGE_S = 5 * 60;
