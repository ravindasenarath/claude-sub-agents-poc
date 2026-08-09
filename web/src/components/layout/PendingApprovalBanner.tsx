import { Container } from "@/components/layout/Container";
import { AGENT_NOT_APPROVED_MESSAGE } from "@/lib/api/agent-me";

/**
 * Persistent banner shown across the agent surface while the signed-in
 * agent's account is awaiting approval (`GET /api/agent/me` →
 * `status === "PENDING_APPROVAL"`). Deliberately a dismissible-free, always
 * visible notice rather than a blocking gate — a forced profile-completion/
 * approval redirect was explicitly rejected by the stakeholder (F0.2 scope).
 * Publish-related controls should check the same status and disable
 * themselves with matching messaging (`AGENT_NOT_APPROVED_MESSAGE`,
 * `isAgentNotApprovedError`) once listing-management UI (FR2–FR6, out of
 * scope here) lands.
 */
export function PendingApprovalBanner() {
  return (
    <div className="border-b border-amber-300 bg-amber-50 text-amber-900">
      <Container className="flex flex-wrap items-center gap-2 py-3 text-sm">
        <span className="font-medium">Account pending approval.</span>
        <span>{AGENT_NOT_APPROVED_MESSAGE}</span>
      </Container>
    </div>
  );
}
