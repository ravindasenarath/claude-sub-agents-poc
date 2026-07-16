import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AgentDashboardPage from "@/app/agent/page";
import { AgentHeader } from "@/components/layout/AgentHeader";

describe("agent surface", () => {
  it("renders the placeholder agent dashboard heading", () => {
    render(<AgentDashboardPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Agent dashboard" }),
    ).toBeInTheDocument();
  });

  it("renders agent nav distinct from the public surface", () => {
    render(<AgentHeader />);
    expect(screen.getByRole("link", { name: "Agent Portal" })).toHaveAttribute("href", "/agent");
    expect(screen.getByRole("link", { name: "My listings" })).toHaveAttribute("href", "/agent");
  });
});
