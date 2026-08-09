import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * `authConfig`'s `SESSION_SECRET` guard (F0.2 review fix) throws at module
 * load, so every case here needs a fresh module instance
 * (`vi.resetModules()`) and dynamic `import()` rather than a static import.
 */
describe("authConfig SESSION_SECRET guard", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  async function loadConfig() {
    return import("@/lib/auth/config");
  }

  it("throws when NODE_ENV is production and SESSION_SECRET is unset", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.SESSION_SECRET;
    delete process.env.NEXT_PHASE;

    await expect(loadConfig()).rejects.toThrow(/SESSION_SECRET/);
  });

  it("throws when NODE_ENV is production and SESSION_SECRET is still the dev placeholder", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SESSION_SECRET = "dev-only-insecure-secret-change-me";
    delete process.env.NEXT_PHASE;

    await expect(loadConfig()).rejects.toThrow(/SESSION_SECRET/);
  });

  it("does not throw in production when a real SESSION_SECRET is set", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SESSION_SECRET = "a-real-32-plus-byte-random-secret-value";
    delete process.env.NEXT_PHASE;

    const { authConfig } = await loadConfig();
    expect(authConfig.sessionSecret).toBe("a-real-32-plus-byte-random-secret-value");
  });

  it("does not throw during `next build` (NEXT_PHASE=phase-production-build) even without a real secret", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.SESSION_SECRET;
    process.env.NEXT_PHASE = "phase-production-build";

    const { authConfig } = await loadConfig();
    expect(authConfig.sessionSecret).toBe("dev-only-insecure-secret-change-me");
  });

  it("does not throw outside production (e.g. test/dev) without a real secret", async () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.SESSION_SECRET;
    delete process.env.NEXT_PHASE;

    const { authConfig } = await loadConfig();
    expect(authConfig.sessionSecret).toBe("dev-only-insecure-secret-change-me");
  });
});
