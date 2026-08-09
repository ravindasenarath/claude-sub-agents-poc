/**
 * `GET /api/agent/me` contract, pinned for F0.2 so the frontend can build
 * against it ahead of the backend (`agent-api`'s real HTTP layer is B0.2b,
 * built in parallel; the underlying `agent` table + `AgentStatus`/
 * `AgentSummary` port already exist as of B0.2a). Field names mirror
 * `docs/architecture/data-model.md`'s `agent` table (`contact_email`,
 * `agency_name`, `phone`, `profile_photo_key`) and
 * `AgentStatus`/`agent_status_check` (`PENDING_APPROVAL` | `ACTIVE` |
 * `DISABLED`) exactly, camelCased for the JSON body; `profilePhotoUrl` is
 * assumed resolved from the internal `profile_photo_key` (ADR-0003) rather
 * than the raw storage key. Update this type (and the dev mock in
 * `agent-me-dev-mock.ts`) once the real B0.2b contract lands if it differs;
 * nothing here should require an architecture decision to change, just a
 * shape sync.
 */
export interface AgentMe {
  id: string;
  name: string;
  agencyName?: string;
  phone?: string;
  contactEmail: string;
  profilePhotoUrl?: string;
  /**
   * `PENDING_APPROVAL` drives the pending-approval banner + disables
   * publish-related controls (F0.2 scope — see `PendingApprovalBanner`).
   * `ACTIVE` may publish. `DISABLED` agents are rejected at the `agent-api`
   * edge per module-boundaries.md — no dedicated UI state for it here since
   * a disabled agent shouldn't be able to reach an authenticated screen
   * that renders this in the first place; flagged as a gap if that
   * assumption turns out wrong once B0.2b lands.
   */
  status: "PENDING_APPROVAL" | "ACTIVE" | "DISABLED";
}

/** Error body shape for a `403` write rejection when the agent isn't approved yet. */
export interface AgentNotApprovedError {
  code: "AGENT_NOT_APPROVED";
  message?: string;
}

export const AGENT_NOT_APPROVED_MESSAGE =
  "Your account is pending approval. Publishing listings is disabled until an administrator approves your agent account.";
