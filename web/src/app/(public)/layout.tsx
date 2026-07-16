import type { ReactNode } from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

/**
 * Layout for the public (unauthenticated) surface — the "Public Web" in
 * module-boundaries.md. Every route in this group (a route group, so it adds
 * no `/…` prefix to the URL) renders without requiring a signed-in agent,
 * satisfying FR13 (visitors never need to log in to search or view
 * listings). Pages here are plain Server Components by default, so they are
 * server-rendered and crawlable per ADR-0001/NFR5.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
