import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { createSessionPayload, encodeSession } from "@/lib/auth/session";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

// `app/agent/layout.tsx` is an async Server Component that reads the
// session via `next/headers`'s `cookies()`, which requires Next's real
// request-scoped AsyncLocalStorage context and throws outside of it. Mock
// the module so this Server Component can be exercised directly, the same
// way Next's own testing guidance recommends for RSCs that use `next/headers`.
const cookieStore = new Map<string, { value: string }>();
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => cookieStore.get(name),
  }),
}));

function setSessionCookie(remember = true) {
  const session = createSessionPayload({
    sub: "sub-1",
    tokens: { accessToken: "access-1", refreshToken: "refresh-1", expiresIn: 3600, sub: "sub-1" },
    remember,
  });
  cookieStore.set(SESSION_COOKIE_NAME, { value: encodeSession(session) });
}

describe("agent/layout.tsx (F0.2)", () => {
  afterEach(() => {
    cookieStore.clear();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("renders the agent shell with the resolved agent's name + a working logout control when authenticated", async () => {
    setSessionCookie();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: "1", name: "Jordan Rivera", agencyName: "Rivera Realty", contactEmail: "j@example.com", status: "ACTIVE" }),
      }),
    );

    const { default: AgentLayout } = await import("@/app/agent/layout");
    const element = await AgentLayout({ children: <div>dashboard content</div> });
    render(element);

    expect(screen.getByText("Jordan Rivera")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByText("dashboard content")).toBeInTheDocument();
    expect(screen.queryByText("Account pending approval.")).not.toBeInTheDocument();
  });

  it("shows the pending-approval banner when the agent's status is PENDING_APPROVAL", async () => {
    setSessionCookie();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ id: "1", name: "Jordan Rivera", agencyName: "Rivera Realty", contactEmail: "j@example.com", status: "PENDING_APPROVAL" }),
      }),
    );

    const { default: AgentLayout } = await import("@/app/agent/layout");
    const element = await AgentLayout({ children: <div /> });
    render(element);

    expect(screen.getByText("Account pending approval.")).toBeInTheDocument();
  });

  it("renders the shell without a name when there's no session (defensive — proxy.ts already guards navigation)", async () => {
    const { default: AgentLayout } = await import("@/app/agent/layout");
    const element = await AgentLayout({ children: <div /> });
    render(element);

    expect(screen.getByRole("link", { name: "Agent Portal" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("shows a clear disabled-account notice on a 403 AGENT_DISABLED from GET /me, instead of a silent blank portal (N2)", async () => {
    setSessionCookie();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ code: "AGENT_DISABLED" }),
      }),
    );

    const { default: AgentLayout } = await import("@/app/agent/layout");
    const element = await AgentLayout({ children: <div>dashboard content</div> });
    render(element);

    expect(screen.getByText("Account disabled.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByText("Account pending approval.")).not.toBeInTheDocument();
  });

  it("shows a generic error notice (not a silent blank portal) when GET /me fails for any other reason (N2)", async () => {
    setSessionCookie();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ code: "INTERNAL_ERROR" }),
      }),
    );

    const { default: AgentLayout } = await import("@/app/agent/layout");
    const element = await AgentLayout({ children: <div>dashboard content</div> });
    render(element);

    expect(screen.getByText("We couldn't load your account.")).toBeInTheDocument();
    expect(screen.getByText("dashboard content")).toBeInTheDocument();
  });
});
