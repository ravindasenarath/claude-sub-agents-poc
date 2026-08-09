import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/errors";
import { isAgentNotApprovedError } from "@/lib/api/agent-errors";

describe("isAgentNotApprovedError (F0.2)", () => {
  it("matches a 403 ApiError with body.code === AGENT_NOT_APPROVED", () => {
    const error = new ApiError(403, "Forbidden", { code: "AGENT_NOT_APPROVED" });
    expect(isAgentNotApprovedError(error)).toBe(true);
  });

  it("does not match a different 403 error", () => {
    const error = new ApiError(403, "Forbidden", { code: "NOT_OWNER" });
    expect(isAgentNotApprovedError(error)).toBe(false);
  });

  it("does not match a non-403 ApiError with the same code", () => {
    const error = new ApiError(401, "Unauthorized", { code: "AGENT_NOT_APPROVED" });
    expect(isAgentNotApprovedError(error)).toBe(false);
  });

  it("does not match a plain error / non-ApiError value", () => {
    expect(isAgentNotApprovedError(new Error("boom"))).toBe(false);
    expect(isAgentNotApprovedError(null)).toBe(false);
    expect(isAgentNotApprovedError(undefined)).toBe(false);
  });
});
