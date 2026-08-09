"use client";

import { useState } from "react";

/**
 * Logout control for the agent header (F0.2). Posts to `/api/auth/logout`
 * (same-origin fetch + the CSRF header the route requires) then does a full
 * navigation to `/login` so every client/server cache tied to the old
 * session is dropped. Deliberately avoids `next/navigation`'s `useRouter`
 * so this component doesn't require an App Router context to render in
 * isolation (e.g. in unit tests).
 */
export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "xhr" },
      });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:bg-[var(--color-surface)] disabled:opacity-60"
    >
      {pending ? "Signing out…" : "Log out"}
    </button>
  );
}
