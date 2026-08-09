import { ApiError } from "./errors";
import type { AgentNotApprovedError } from "./agent-me";

/**
 * Detects the `403 AGENT_NOT_APPROVED` shape a write call returns for a
 * pending-approval agent, so callers can show the same messaging as
 * `PendingApprovalBanner` (`AGENT_NOT_APPROVED_MESSAGE`). No listing-write UI
 * exists yet (FR2–FR6 are out of scope for F0.2) — this is the shared
 * primitive that UI lands on top of when it does.
 */
export function isAgentNotApprovedError(error: unknown): error is ApiError & {
  body: AgentNotApprovedError;
} {
  return (
    error instanceof ApiError &&
    error.status === 403 &&
    typeof error.body === "object" &&
    error.body !== null &&
    (error.body as { code?: unknown }).code === "AGENT_NOT_APPROVED"
  );
}
