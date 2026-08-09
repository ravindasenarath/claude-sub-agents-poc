import { Container } from "@/components/layout/Container";
import { AGENT_DISABLED_MESSAGE } from "@/lib/api/agent-me";

interface AccountIssueBannerProps {
  /**
   * `"disabled"` — the signed-in agent's account was rejected with `403
   * AGENT_DISABLED` (see `agent-errors.ts`'s `isAgentDisabledError`).
   * `"unknown"` — `GET /api/agent/me` failed for any other reason (5xx,
   * network error, unexpected shape); the agent may or may not actually be
   * able to use the rest of the portal, so this is a non-blocking notice
   * rather than a hard stop.
   */
  variant: "disabled" | "unknown";
}

/**
 * Persistent banner shown across the agent surface (`app/agent/layout.tsx`)
 * when the signed-in agent's profile (`GET /api/agent/me`) couldn't be
 * loaded cleanly (N2, F0.2 review fix) — replaces a previously-silent
 * `catch { return null }` that rendered a portal with no name, no banner,
 * and no explanation for a disabled account or a broken backend call.
 */
export function AccountIssueBanner({ variant }: AccountIssueBannerProps) {
  if (variant === "disabled") {
    return (
      <div className="border-b border-red-300 bg-red-50 text-red-900">
        <Container className="flex flex-wrap items-center gap-2 py-3 text-sm">
          <span className="font-medium">Account disabled.</span>
          <span>{AGENT_DISABLED_MESSAGE}</span>
        </Container>
      </div>
    );
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50 text-amber-900">
      <Container className="flex flex-wrap items-center gap-2 py-3 text-sm">
        <span className="font-medium">We couldn&apos;t load your account.</span>
        <span>
          Something went wrong loading your profile. Some features may not work correctly — try
          refreshing the page.
        </span>
      </Container>
    </div>
  );
}
