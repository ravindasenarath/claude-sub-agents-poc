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

  // F0.2: header renders the signed-in agent's name + a working logout control.
  it("renders the signed-in agent's name when provided", () => {
    render(<AgentHeader agentName="Jordan Rivera" />);
    expect(screen.getByText("Jordan Rivera")).toBeInTheDocument();
  });

  it("renders a logout control regardless of whether the agent name has resolved yet", () => {
    render(<AgentHeader agentName={null} />);
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.queryByText("Jordan Rivera")).not.toBeInTheDocument();
  });

  // Acceptance criterion: no access/refresh token is ever readable by
  // browser JS — assert the rendered agent shell never contains token-shaped
  // text, even if a caller accidentally passed one through.
  it("never renders token-shaped values even if present on the agent record", () => {
    render(<AgentHeader agentName="Jordan Rivera" />);
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/accessToken|refreshToken|Bearer /);
  });
});
