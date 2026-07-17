import { Container } from "@/components/layout/Container";
import { Heading, Text } from "@/components/ui/Typography";

/**
 * Public home / listing-browse placeholder.
 *
 * This is app-shell scaffolding only (task F0.1). The actual browse/search UI
 * (FR8–FR11) is a separate downstream task and will replace this content.
 */
export default function PublicHomePage() {
  return (
    <Container as="section" className="py-12 sm:py-16">
      <Heading level={1}>Find your next property</Heading>
      <Text muted className="mt-4 max-w-2xl">
        Search and browse published listings for sale or rent. This page is a
        scaffolding placeholder — listing search and results (FR8–FR11) land
        in a downstream task.
      </Text>
    </Container>
  );
}
