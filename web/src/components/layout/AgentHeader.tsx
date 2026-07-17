import Link from "next/link";
import { Container } from "@/components/layout/Container";

/**
 * Header for the agent (authenticated) surface.
 *
 * NOTE: no auth/session state is wired up yet — that lands in F0.2. This
 * shell renders unconditionally for now. Once F0.2 lands, this is the place
 * to render the signed-in agent's name/logout action, and route protection
 * for `/agent/*` should be added via `proxy.ts` (Next.js 16's replacement
 * for middleware) rather than in this component.
 */
export function AgentHeader() {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/agent" className="text-lg font-semibold tracking-tight">
          Agent Portal
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/agent" className="hover:underline">
            My listings
          </Link>
          <Link href="/" className="hover:underline">
            View public site
          </Link>
        </nav>
      </Container>
    </header>
  );
}
