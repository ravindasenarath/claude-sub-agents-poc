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
   * edge per module-boundaries.md — as a `403 AGENT_DISABLED` on the
   * request itself (see `AgentDisabledError`/`isAgentDisabledError` below,
   * and `app/agent/layout.tsx`, which handles that 403 explicitly), *not*
   * as a `200 GET /me` body with this status value. This member is kept for
   * forward-compatibility only (in case a future contract ever does return
   * it in a `200` body) — it's currently unreachable by construction here,
   * so don't rely on `status === "DISABLED"` ever being observed.
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

/**
 * Error body shape for the `403` a disabled agent's otherwise-valid session
 * gets rejected with — including on `GET /me` itself, which is why
 * `status: "DISABLED"` above is unreachable in a successful response (see
 * `app/agent/layout.tsx`'s `loadAgentProfile`, from the parallel B0.2b
 * backend task).
 */
export interface AgentDisabledError {
  code: "AGENT_DISABLED";
  message?: string;
}

export const AGENT_DISABLED_MESSAGE =
  "Your agent account has been disabled. Contact an administrator if you believe this is a mistake.";
