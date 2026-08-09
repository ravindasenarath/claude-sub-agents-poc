import type { ReactNode } from "react";
import { AgentHeader } from "@/components/layout/AgentHeader";
import { PendingApprovalBanner } from "@/components/layout/PendingApprovalBanner";
import { getSessionForServerComponent, refreshSessionIfNeeded } from "@/lib/auth/session";
import { createAuthorizedAgentApiClient } from "@/lib/api/agent-api.server";
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
  const agent = await loadAgentProfile();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AgentHeader agentName={agent?.name ?? null} />
      {agent?.status === "PENDING_APPROVAL" ? <PendingApprovalBanner /> : null}
      <main className="flex-1">{children}</main>
    </div>
  );
}

async function loadAgentProfile(): Promise<AgentMe | null> {
  const session = await getSessionForServerComponent();
  if (!session) return null;

  try {
    const { session: fresh } = await refreshSessionIfNeeded(session);
    const client = createAuthorizedAgentApiClient(fresh.accessToken);
    return await client.get<AgentMe>("/me");
  } catch {
    // `GET /api/agent/me` isn't guaranteed to exist yet (mocked for F0.2 —
    // see `AGENT_API_MOCK`/agent-me-dev-mock.ts); render the shell without a
    // name rather than failing the whole agent surface.
    return null;
  }
}
