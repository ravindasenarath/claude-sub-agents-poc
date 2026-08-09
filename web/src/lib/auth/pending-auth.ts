import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { decryptJson, encryptJson } from "./crypto";
import { authConfig } from "./config";
import { PENDING_AUTH_COOKIE_NAME, PENDING_AUTH_MAX_AGE_S } from "./constants";

/**
 * Short-lived, pre-auth cookie carrying the OIDC `state`, PKCE
 * `code_verifier`, the "remember me" choice, and the originally-requested
 * path across the redirect to the IdP and back — the callback needs all of
 * these, and none of them are safe/possible to pass as plain `state` query
 * params (state alone is a single opaque CSRF token).
 */
export interface PendingAuthPayload {
  state: string;
  codeVerifier: string;
  remember: boolean;
  returnTo: string;
  createdAt: number;
}

export function encodePendingAuth(payload: PendingAuthPayload): string {
  return encryptJson(payload, authConfig.sessionSecret);
}

export function decodePendingAuth(raw: string | undefined): PendingAuthPayload | null {
  if (!raw) return null;
  const payload = decryptJson<PendingAuthPayload>(raw, authConfig.sessionSecret);
  if (!payload) return null;
  if (Date.now() - payload.createdAt > PENDING_AUTH_MAX_AGE_S * 1000) return null;
  return payload;
}

export function getPendingAuthFromRequest(request: NextRequest): PendingAuthPayload | null {
  return decodePendingAuth(request.cookies.get(PENDING_AUTH_COOKIE_NAME)?.value);
}

export function applyPendingAuthCookie(response: NextResponse, payload: PendingAuthPayload): void {
  response.cookies.set(PENDING_AUTH_COOKIE_NAME, encodePendingAuth(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_AUTH_MAX_AGE_S,
  });
}

export function clearPendingAuthCookie(response: NextResponse): void {
  response.cookies.set(PENDING_AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
}
