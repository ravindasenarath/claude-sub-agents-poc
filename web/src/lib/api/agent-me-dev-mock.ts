import "server-only";
import type { AgentMe } from "./agent-me";

/**
 * Canned `GET /api/agent/me` response served by the BFF proxy when
 * `AGENT_API_MOCK=true` (see `server-config.ts`) — local frontend dev and
 * this task's dev-mock regression test, ahead of the real backend
 * `agent-api` HTTP layer (B0.2b; the `agent` table/status enum this mirrors
 * already exists as of B0.2a). `AGENT_API_MOCK_STATUS` lets you flip to the
 * pending-approval banner/messaging without a real backend.
 */
export function getDevMockAgentMe(): AgentMe {
  const status: AgentMe["status"] =
    process.env.AGENT_API_MOCK_STATUS === "PENDING_APPROVAL" ? "PENDING_APPROVAL" : "ACTIVE";
  return {
    id: "dev-agent-1",
    name: "Jordan Rivera",
    agencyName: "Rivera Realty",
    contactEmail: "jordan@rivera-realty.example",
    status,
  };
}
