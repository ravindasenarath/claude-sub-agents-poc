import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionPayload,
  decodeSession,
  encodeSession,
  isSessionExpired,
  refreshSessionIfNeeded,
  type SessionPayload,
} from "@/lib/auth/session";
import {
  ABSOLUTE_WINDOW_REMEMBER_MS,
  IDLE_WINDOW_DEFAULT_MS,
  IDLE_WINDOW_REMEMBER_MS,
  SET_COOKIE_THROTTLE_MS,
} from "@/lib/auth/constants";

function fakeTokens(overrides: Partial<{ accessToken: string; refreshToken: string; expiresIn: number }> = {}) {
  return {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresIn: 300,
    sub: "auth0|agent-1",
    ...overrides,
  };
}

describe("session payload creation + expiry (F0.2)", () => {
  it("sets a short idle/absolute window when remember is false", () => {
    const now = Date.now();
    const session = createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: false });

    expect(session.remember).toBe(false);
    expect(session.idleExpiry - now).toBeCloseTo(IDLE_WINDOW_DEFAULT_MS, -2);
    expect(session.absoluteExpiry - now).toBeCloseTo(IDLE_WINDOW_DEFAULT_MS, -2);
  });

  it("sets a long idle window capped by a longer absolute window when remember is true", () => {
    const now = Date.now();
    const session = createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: true });

    expect(session.remember).toBe(true);
    expect(session.idleExpiry - now).toBeCloseTo(IDLE_WINDOW_REMEMBER_MS, -2);
    expect(session.absoluteExpiry - now).toBeCloseTo(ABSOLUTE_WINDOW_REMEMBER_MS, -2);
  });

  it("round-trips through encrypt/decrypt", () => {
    const session = createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: true });
    const decoded = decodeSession(encodeSession(session));
    expect(decoded).toEqual(session);
  });

  it("rejects a tampered/garbage cookie value", () => {
    const session = createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: true });
    const tampered = `${encodeSession(session)}x`;
    expect(decodeSession(tampered)).toBeNull();
    expect(decodeSession("not-even-close")).toBeNull();
    expect(decodeSession(undefined)).toBeNull();
  });

  it("treats an idle-expired session as expired even before the absolute cap", () => {
    const session: SessionPayload = {
      ...createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: true }),
      idleExpiry: Date.now() - 1_000,
    };
    expect(isSessionExpired(session)).toBe(true);
    expect(decodeSession(encodeSession(session))).toBeNull();
  });

  it("treats an absolute-expired session as expired even with a fresh idle window", () => {
    const session: SessionPayload = {
      ...createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: true }),
      absoluteExpiry: Date.now() - 1_000,
    };
    expect(isSessionExpired(session)).toBe(true);
  });
});

describe("refreshSessionIfNeeded (sliding renewal, F0.2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not refresh or rewrite the cookie when nothing is near expiry and within the throttle window", async () => {
    const now = Date.now();
    const session = createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await refreshSessionIfNeeded(session, now + 1_000);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.cookieUpdate).toBeNull();
    expect(result.session.accessToken).toBe(session.accessToken);
  });

  it("slides idleExpiry and rewrites the cookie once the throttle window has passed, without refreshing the token", async () => {
    const now = Date.now();
    // Long-lived access token so the throttle window elapsing doesn't also
    // cross the near-expiry refresh threshold in this assertion, and
    // `remember: true` so the idle window has room to slide (unremembered
    // sessions use the same window for idle and absolute, so there's
    // nothing to observe sliding into).
    const session = createSessionPayload({
      sub: "sub-1",
      tokens: fakeTokens({ expiresIn: 3600 }),
      remember: true,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const later = now + SET_COOKIE_THROTTLE_MS + 1_000;
    const result = await refreshSessionIfNeeded(session, later);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.cookieUpdate).not.toBeNull();
    expect(result.cookieUpdate?.idleExpiry).toBeGreaterThan(session.idleExpiry);
    expect(result.cookieUpdate?.lastRenewedAt).toBe(later);
  });

  it("refreshes the access token when within the near-expiry window and always persists (ignores the throttle)", async () => {
    const session = createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: false });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "access-2",
        refresh_token: "refresh-2",
        expires_in: 300,
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Just inside the throttle window (would otherwise be skipped), but the
    // access token is about to expire — refresh must still happen and force
    // a cookie rewrite.
    const almostExpired = session.accessExpiry - 1_000;
    const result = await refreshSessionIfNeeded(session, almostExpired);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.cookieUpdate).not.toBeNull();
    expect(result.cookieUpdate?.accessToken).toBe("access-2");
    expect(result.cookieUpdate?.refreshToken).toBe("refresh-2");
    expect(result.session.accessToken).toBe("access-2");
  });

  it("never lets slid idleExpiry exceed absoluteExpiry", async () => {
    const now = Date.now();
    const session: SessionPayload = {
      ...createSessionPayload({ sub: "sub-1", tokens: fakeTokens(), remember: true }),
      absoluteExpiry: now + 1_000,
      idleExpiry: now + 1_000,
      lastRenewedAt: now - SET_COOKIE_THROTTLE_MS - 1,
    };
    vi.stubGlobal("fetch", vi.fn());

    const result = await refreshSessionIfNeeded(session, now);

    expect(result.cookieUpdate?.idleExpiry).toBeLessThanOrEqual(session.absoluteExpiry);
  });
});
