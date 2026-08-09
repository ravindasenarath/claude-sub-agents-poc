import "server-only";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { decryptJson, encryptJson } from "./crypto";
import { authConfig } from "./config";
import { refreshTokens as oidcRefreshTokens, type TokenResponse } from "./oidc-client";
import {
  ABSOLUTE_WINDOW_REMEMBER_MS,
  ACCESS_TOKEN_REFRESH_WINDOW_MS,
  IDLE_WINDOW_DEFAULT_MS,
  IDLE_WINDOW_REMEMBER_MS,
  SESSION_COOKIE_NAME,
  SET_COOKIE_THROTTLE_MS,
} from "./constants";

/**
 * Encrypted session payload (see `crypto.ts`) — this is the *only* place the
 * agent's access/refresh tokens exist. It never leaves the server: it's
 * encrypted into an httpOnly cookie, and the BFF proxy (`api/agent/[...path]`)
 * is the only thing that ever reads it back out to attach a bearer token,
 * server-side, to backend `agent-api` calls (see module-boundaries.md +
 * ADR-0002's token-transport amendment). Browser JS never sees these fields.
 */
export interface SessionPayload {
  /** OIDC subject id (ADR-0002's `auth_subject`). */
  sub: string;
  accessToken: string;
  refreshToken: string;
  /** Epoch ms. */
  accessExpiry: number;
  /** Epoch ms — absolute cap regardless of activity. */
  absoluteExpiry: number;
  /** Epoch ms — session dies if idle past this, even before `absoluteExpiry`. */
  idleExpiry: number;
  /** "Remember me" choice, carried from the login form through the OIDC round trip. */
  remember: boolean;
  /** Epoch ms of the last time this payload was actually re-encrypted into `Set-Cookie` (throttling marker). */
  lastRenewedAt: number;
}

export function createSessionPayload(params: {
  sub: string;
  tokens: TokenResponse;
  remember: boolean;
}): SessionPayload {
  const now = Date.now();
  const idleWindowMs = params.remember ? IDLE_WINDOW_REMEMBER_MS : IDLE_WINDOW_DEFAULT_MS;
  const absoluteWindowMs = params.remember ? ABSOLUTE_WINDOW_REMEMBER_MS : IDLE_WINDOW_DEFAULT_MS;
  return {
    sub: params.sub,
    accessToken: params.tokens.accessToken,
    refreshToken: params.tokens.refreshToken ?? "",
    accessExpiry: now + params.tokens.expiresIn * 1000,
    idleExpiry: now + idleWindowMs,
    absoluteExpiry: now + absoluteWindowMs,
    remember: params.remember,
    lastRenewedAt: now,
  };
}

export function isSessionExpired(session: SessionPayload, now = Date.now()): boolean {
  return now > session.absoluteExpiry || now > session.idleExpiry;
}

export function encodeSession(session: SessionPayload): string {
  return encryptJson(session, authConfig.sessionSecret);
}

/** Decrypts + validates expiry in one step; returns `null` for anything invalid or expired. */
export function decodeSession(raw: string | undefined): SessionPayload | null {
  if (!raw) return null;
  const payload = decryptJson<SessionPayload>(raw, authConfig.sessionSecret);
  if (!payload) return null;
  if (isSessionExpired(payload)) return null;
  return payload;
}

/** For Route Handlers / `proxy.ts`, which receive a `NextRequest` directly. */
export function getSessionFromRequest(request: NextRequest): SessionPayload | null {
  return decodeSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

/**
 * For Server Components (e.g. `app/agent/layout.tsx`), which can only read
 * cookies via `next/headers` (and, unlike Route Handlers, cannot write them —
 * sliding-renewal persistence happens on the next request that goes through
 * the BFF proxy or an auth route instead).
 */
export async function getSessionForServerComponent(): Promise<SessionPayload | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE_NAME)?.value);
}

function sessionCookieOptions(session: SessionPayload) {
  const base = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  // Unchecked "remember me": omit maxAge entirely so it's a browser-session
  // cookie (cleared when the browser closes); the ~8h idle timeout is still
  // enforced server-side via `idleExpiry`/`isSessionExpired`.
  if (!session.remember) return base;
  return { ...base, maxAge: Math.max(0, Math.floor((session.absoluteExpiry - Date.now()) / 1000)) };
}

export function applySessionCookie(response: NextResponse, session: SessionPayload): void {
  response.cookies.set(SESSION_COOKIE_NAME, encodeSession(session), sessionCookieOptions(session));
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
}

export interface RefreshResult {
  /** Session to use for *this* request (already has a fresh access token if one was needed). */
  session: SessionPayload;
  /** Non-null when the caller should persist this back via `applySessionCookie` (Route Handlers only). */
  cookieUpdate: SessionPayload | null;
}

/**
 * Sliding renewal: refreshes the access token once it's within
 * `ACCESS_TOKEN_REFRESH_WINDOW_MS` of expiring, and otherwise slides
 * `idleExpiry` forward on activity — but throttles the resulting
 * `Set-Cookie` rewrite to at most once per `SET_COOKIE_THROTTLE_MS`, since a
 * genuine token refresh always has to be persisted immediately (the
 * refresh_token may have rotated) while a plain idle-touch doesn't need to
 * rewrite the cookie on literally every request.
 */
export async function refreshSessionIfNeeded(
  session: SessionPayload,
  now = Date.now(),
): Promise<RefreshResult> {
  let next = session;
  let tokenRefreshed = false;

  if (now >= session.accessExpiry - ACCESS_TOKEN_REFRESH_WINDOW_MS) {
    const tokens = await oidcRefreshTokens({ refreshToken: session.refreshToken });
    next = {
      ...next,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? next.refreshToken,
      accessExpiry: now + tokens.expiresIn * 1000,
    };
    tokenRefreshed = true;
  }

  const withinThrottleWindow = now - next.lastRenewedAt < SET_COOKIE_THROTTLE_MS;
  if (!tokenRefreshed && withinThrottleWindow) {
    return { session: next, cookieUpdate: null };
  }

  const idleWindowMs = next.remember ? IDLE_WINDOW_REMEMBER_MS : IDLE_WINDOW_DEFAULT_MS;
  const updated: SessionPayload = {
    ...next,
    idleExpiry: Math.min(now + idleWindowMs, next.absoluteExpiry),
    lastRenewedAt: now,
  };
  return { session: updated, cookieUpdate: updated };
}
