import { Container } from "@/components/layout/Container";

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--color-border)]">
      <Container className="flex h-16 items-center text-sm text-[var(--color-muted)]">
        <p>&copy; {new Date().getFullYear()} Property Listing Platform</p>
      </Container>
    </footer>
  );
}
