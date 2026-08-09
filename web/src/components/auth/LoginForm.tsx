import { Heading, Text } from "@/components/ui/Typography";

interface LoginFormProps {
  returnTo: string;
  error?: string;
}

/**
 * Presentational sign-in form (F0.2). Submits a plain GET form to
 * `/api/auth/login`, which starts the Authorization Code + PKCE redirect to
 * the IdP (`docs/architecture/ADR-0002`) — no client-side JS/OIDC SDK
 * required for this step. `returnTo` is round-tripped through the OIDC
 * flow (pre-auth cookie) so login returns to the originally-requested
 * `/agent/*` path.
 *
 * No in-app signup form (F0.2 scope) — "Create account" deep-links through
 * the same `/api/auth/login` route with `signup=1`, which asks the IdP for
 * its hosted signup screen (`OIDC_SIGNUP_PARAM`/`OIDC_SIGNUP_PARAM_VALUE`).
 */
export function LoginForm({ returnTo, error }: LoginFormProps) {
  return (
    <div className="w-full max-w-sm">
      <Heading level={1} className="text-center">
        Agent sign in
      </Heading>
      <Text muted className="mt-2 text-center">
        Sign in to manage your property listings.
      </Text>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          Sign-in failed. Please try again.
        </p>
      ) : null}

      <form action="/api/auth/login" method="GET" className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="remember" value="on" className="h-4 w-4" />
          Remember me on this device
        </label>
        <button
          type="submit"
          className="rounded-md bg-[var(--color-foreground)] px-4 py-2 text-sm font-medium text-[var(--color-background)]"
        >
          Continue to sign in
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        New agent?{" "}
        <a
          href={`/api/auth/login?signup=1&returnTo=${encodeURIComponent(returnTo)}`}
          className="underline"
        >
          Create an account
        </a>
      </p>
    </div>
  );
}
