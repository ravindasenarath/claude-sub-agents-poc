import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PendingApprovalBanner } from "@/components/layout/PendingApprovalBanner";
import { AGENT_NOT_APPROVED_MESSAGE } from "@/lib/api/agent-me";

describe("PendingApprovalBanner (F0.2)", () => {
  it("renders the pending-approval notice", () => {
    render(<PendingApprovalBanner />);
    expect(screen.getByText("Account pending approval.")).toBeInTheDocument();
    expect(screen.getByText(AGENT_NOT_APPROVED_MESSAGE)).toBeInTheDocument();
  });
});
