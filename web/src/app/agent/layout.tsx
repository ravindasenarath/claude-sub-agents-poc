import type { ReactNode } from "react";
import { AgentHeader } from "@/components/layout/AgentHeader";
import { PendingApprovalBanner } from "@/components/layout/PendingApprovalBanner";
import { AccountIssueBanner } from "@/components/layout/AccountIssueBanner";
import { getSessionForServerComponent, refreshSessionIfNeeded } from "@/lib/auth/session";
import { createAuthorizedAgentApiClient } from "@/lib/api/agent-api.server";
import { isAgentDisabledError } from "@/lib/api/agent-errors";
import type { AgentMe } from "@/lib/api/agent-me";

/**
 * Layout for the agent (authenticated) surface — the "Agent Web" in
 * module-boundaries.md. Kept under a real `/agent` URL segment (rather than
 * only a route group) so `proxy.ts` (matcher `"/agent/:path*"`) has a single
 * path prefix to protect.
 *
 * F0.2: `proxy.ts` already redirected unauthenticated requests before this
 * ever renders, but this layout re-resolves the session anyway (defensively,
 * and because it needs it) to fetch the signed-in agent's profile
 * server-side via the server-only agent-api client (bypassing the BFF proxy
 * hop, since this already runs on the server) and pass it down to
 * `AgentHeader`/`PendingApprovalBanner`. Note Server Components can't write
 * cookies, so a sliding-renewal token refresh here isn't persisted back to
 * the browser — that happens on the next request that hits the BFF proxy or
 * an auth route, both of which can set cookies.
 */
export default async function AgentLayout({ children }: { children: ReactNode }) {
  const result = await loadAgentProfile();
  const agent = result.kind === "ok" ? result.agent : null;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AgentHeader agentName={agent?.name ?? null} />
      {agent?.status === "PENDING_APPROVAL" ? <PendingApprovalBanner /> : null}
      {result.kind === "disabled" ? <AccountIssueBanner variant="disabled" /> : null}
      {result.kind === "unknown-error" ? <AccountIssueBanner variant="unknown" /> : null}
      <main className="flex-1">{children}</main>
    </div>
  );
}

type AgentProfileResult =
  | { kind: "no-session" }
  | { kind: "ok"; agent: AgentMe }
  | { kind: "disabled" }
  | { kind: "unknown-error" };

async function loadAgentProfile(): Promise<AgentProfileResult> {
  const session = await getSessionForServerComponent();
  if (!session) return { kind: "no-session" };

  try {
    const { session: fresh } = await refreshSessionIfNeeded(session);
    const client = createAuthorizedAgentApiClient(fresh.accessToken);
    const agent = await client.get<AgentMe>("/me");
    return { kind: "ok", agent };
  } catch (error) {
    // A disabled agent's otherwise-valid session gets a `403 AGENT_DISABLED`
    // on `GET /me` itself (parallel B0.2b backend task, not yet merged) —
    // show a clear, explicit notice for that case rather than a silent,
    // unexplained dead end. Any other failure (5xx, network error, an
    // `agent-api` that doesn't implement `/me` yet in this environment) is
    // still not fatal to the whole agent surface, but it's surfaced as a
    // generic error state instead of being swallowed outright.
    if (isAgentDisabledError(error)) return { kind: "disabled" };
    return { kind: "unknown-error" };
  }
}
