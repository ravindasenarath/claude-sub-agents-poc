import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LogoutButton } from "@/components/layout/LogoutButton";

describe("LogoutButton (F0.2)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("posts to /api/auth/logout with the CSRF header + same-origin credentials on click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal("fetch", fetchMock);
    // jsdom doesn't implement navigation; stub it out so the click handler's
    // `window.location.href = ...` doesn't log a jsdom "not implemented" error.
    const originalHref = window.location.href;
    Object.defineProperty(window, "location", {
      value: { ...window.location, href: originalHref },
      writable: true,
    });

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        headers: { "X-Requested-With": "xhr" },
      }),
    );
  });
});
