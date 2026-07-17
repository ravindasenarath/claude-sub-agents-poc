import type { ReactNode } from "react";
import { AgentHeader } from "@/components/layout/AgentHeader";

/**
 * Layout for the agent (authenticated) surface — the "Agent Web" in
 * module-boundaries.md. Deliberately kept under a real `/agent` URL segment
 * (rather than only a route group) so a future auth guard (F0.2) has a
 * single path prefix to protect, e.g. via `proxy.ts` matcher `"/agent/:path*"`.
 *
 * No authentication is wired up yet — every route under `/agent` currently
 * renders for anyone. Wiring session/login and gating access is F0.2, a
 * separate downstream task.
 */
export default function AgentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <AgentHeader />
      <main className="flex-1">{children}</main>
    </div>
  );
}
