import { Container } from "@/components/layout/Container";
import { Heading, Text } from "@/components/ui/Typography";

/**
 * Agent dashboard placeholder.
 *
 * App-shell scaffolding only (task F0.1). Login (F0.2) and listing
 * management screens (FR2–FR6) are separate downstream tasks and will
 * replace this content.
 */
export default function AgentDashboardPage() {
  return (
    <Container as="section" className="py-12 sm:py-16">
      <Heading level={1}>Agent dashboard</Heading>
      <Text muted className="mt-4 max-w-2xl">
        Manage your property listings here. This page is a scaffolding
        placeholder — agent sign-in (F0.2) and listing management (FR2–FR6)
        land in downstream tasks.
      </Text>
    </Container>
  );
}
