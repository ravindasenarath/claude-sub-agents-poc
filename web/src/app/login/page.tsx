import { Container } from "@/components/layout/Container";
import { LoginForm } from "@/components/auth/LoginForm";
import { RETURN_TO_DEFAULT } from "@/lib/auth/constants";

interface LoginPageProps {
  searchParams: Promise<{ returnTo?: string; error?: string }>;
}

/**
 * Agent login page (F0.2). Reached directly, or via `proxy.ts` redirecting
 * an unauthenticated `/agent/*` request here with `?returnTo=<path>`.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { returnTo, error } = await searchParams;

  return (
    <Container as="section" className="flex min-h-[60vh] flex-col items-center justify-center py-12 sm:py-16">
      <LoginForm returnTo={returnTo ?? RETURN_TO_DEFAULT} error={error} />
    </Container>
  );
}
