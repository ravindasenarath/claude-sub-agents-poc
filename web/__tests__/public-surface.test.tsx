import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import PublicHomePage from "@/app/(public)/page";
import { PublicHeader } from "@/components/layout/PublicHeader";

describe("public surface", () => {
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
});
