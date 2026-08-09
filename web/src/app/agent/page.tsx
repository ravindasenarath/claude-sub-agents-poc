import { Container } from "@/components/layout/Container";
import { Heading, Text } from "@/components/ui/Typography";

/**
 * Agent dashboard placeholder.
 *
 * Auth/session (F0.2) now gates this page (`proxy.ts` + `agent/layout.tsx`)
 * and renders the signed-in agent's name/logout in the header. Listing
 * management screens (FR2–FR6) are a separate downstream task and will
 * replace this content.
 */
export default function AgentDashboardPage() {
  return (
    <Container as="section" className="py-12 sm:py-16">
      <Heading level={1}>Agent dashboard</Heading>
      <Text muted className="mt-4 max-w-2xl">
        Manage your property listings here. This page is a scaffolding
        placeholder — listing management (FR2–FR6) lands in a downstream
        task.
      </Text>
    </Container>
  );
}
