import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoginForm } from "@/components/auth/LoginForm";

describe("LoginForm (F0.2)", () => {
  it("submits to /api/auth/login with returnTo and a remember-me checkbox", () => {
    render(<LoginForm returnTo="/agent/listings" />);

    const form = screen.getByRole("button", { name: "Continue to sign in" }).closest("form");
    expect(form).toHaveAttribute("action", "/api/auth/login");
    expect(form).toHaveAttribute("method", "GET");

    const returnToInput = screen.getByDisplayValue("/agent/listings", { exact: true }) as HTMLInputElement;
    expect(returnToInput).toHaveAttribute("type", "hidden");
    expect(returnToInput).toHaveAttribute("name", "returnTo");

    expect(screen.getByLabelText("Remember me on this device")).toHaveAttribute("type", "checkbox");
  });

  it("links Create account to the login route's hosted-signup deep link", () => {
    render(<LoginForm returnTo="/agent" />);
    const link = screen.getByRole("link", { name: "Create an account" });
    expect(link).toHaveAttribute("href", "/api/auth/login?signup=1&returnTo=%2Fagent");
  });

  it("shows an error message when ?error is present, and nothing otherwise", () => {
    const { rerender } = render(<LoginForm returnTo="/agent" error="auth_failed" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Sign-in failed");

    rerender(<LoginForm returnTo="/agent" />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
