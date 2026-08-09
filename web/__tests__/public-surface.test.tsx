import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicHomePage from "@/app/(public)/page";
import { PublicHeader } from "@/components/layout/PublicHeader";

describe("public surface", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the placeholder home page heading", () => {
    render(<PublicHomePage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Find your next property" }),
    ).toBeInTheDocument();
  });

  it("renders public nav without requiring auth state", () => {
    render(<PublicHeader />);
    expect(screen.getByRole("link", { name: "Browse listings" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Agent login" })).toHaveAttribute("href", "/agent");
  });

  // Regression test (F0.2 acceptance criterion): public routes render fully
  // unauthenticated — no redirect, and no session/agent-api call of any
  // kind (in particular, no `GET /api/agent/me`).
  it("never calls fetch (no session bootstrap / /api/agent/me call) when rendering the public surface", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<PublicHomePage />);
    render(<PublicHeader />);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
