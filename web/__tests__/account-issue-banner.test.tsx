import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccountIssueBanner } from "@/components/layout/AccountIssueBanner";
import { AGENT_DISABLED_MESSAGE } from "@/lib/api/agent-me";

describe("AccountIssueBanner (N2, F0.2 review fix)", () => {
  it("renders the disabled-account notice for variant='disabled'", () => {
    render(<AccountIssueBanner variant="disabled" />);
    expect(screen.getByText("Account disabled.")).toBeInTheDocument();
    expect(screen.getByText(AGENT_DISABLED_MESSAGE)).toBeInTheDocument();
  });

  it("renders a generic notice for variant='unknown'", () => {
    render(<AccountIssueBanner variant="unknown" />);
    expect(screen.getByText("We couldn't load your account.")).toBeInTheDocument();
  });
});
