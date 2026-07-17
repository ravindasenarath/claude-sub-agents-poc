import Link from "next/link";
import { Container } from "@/components/layout/Container";

/**
 * Header for the public (unauthenticated) surface. Nav links are placeholders
 * for downstream browse/search screens — no auth state is read here (FR13:
 * public browsing needs no login).
 */
export function PublicHeader() {
  return (
    <header className="border-b border-[var(--color-border)]">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Property Listing Platform
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="hover:underline">
            Browse listings
          </Link>
          <Link
            href="/agent"
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 hover:bg-[var(--color-surface)]"
          >
            Agent login
          </Link>
        </nav>
      </Container>
    </header>
  );
}
