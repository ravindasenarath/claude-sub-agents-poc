import Link from "next/link";
import { Container } from "@/components/layout/Container";
import { LogoutButton } from "@/components/layout/LogoutButton";

interface AgentHeaderProps {
  /** Signed-in agent's display name (from `GET /api/agent/me`), or `null` while unresolved. */
  agentName?: string | null;
}

/**
 * Header for the agent (authenticated) surface.
 *
 * Auth/session state is resolved server-side (F0.2 — encrypted session
 * cookie + BFF proxy, see docs/architecture/ADR-0002 and
 * module-boundaries.md) in `app/agent/layout.tsx`, which passes the agent's
 * name down as a prop; this component stays a plain presentational piece
 * with no direct cookie/token access. Route protection for `/agent/*` lives
 * in `proxy.ts` (Next.js 16's replacement for middleware,
 * matcher `"/agent/:path*"`), not here.
 */
export function AgentHeader({ agentName }: AgentHeaderProps) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <Container className="flex min-h-16 flex-wrap items-center justify-between gap-2 py-2">
        <Link href="/agent" className="text-lg font-semibold tracking-tight">
          Agent Portal
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/agent" className="hover:underline">
            My listings
          </Link>
          <Link href="/" className="hover:underline">
            View public site
          </Link>
          {agentName ? (
            <span className="hidden text-[var(--color-muted)] sm:inline">{agentName}</span>
          ) : null}
          <LogoutButton />
        </nav>
      </Container>
    </header>
  );
}
