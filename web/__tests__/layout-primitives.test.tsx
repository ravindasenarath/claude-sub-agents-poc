import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Container } from "@/components/layout/Container";
import { Stack } from "@/components/layout/Stack";
import { Heading, Text } from "@/components/ui/Typography";

describe("layout primitives", () => {
  it("Container renders its children and applies max-width/padding classes", () => {
    render(<Container>content</Container>);
    const el = screen.getByText("content");
    expect(el).toHaveClass("mx-auto", "max-w-6xl");
  });

  it("Container can render as a different element", () => {
    render(<Container as="main">main content</Container>);
    expect(screen.getByText("main content").tagName).toBe("MAIN");
  });

  it("Stack applies the requested gap and direction", () => {
    render(
      <Stack gap={2} direction="row">
        <span>a</span>
      </Stack>,
    );
    const el = screen.getByText("a").parentElement;
    expect(el).toHaveClass("flex-row", "gap-2");
  });

  it("Heading renders the requested heading level", () => {
    render(<Heading level={2}>Section title</Heading>);
    expect(screen.getByRole("heading", { level: 2, name: "Section title" })).toBeInTheDocument();
  });

  it("Text renders body copy", () => {
    render(<Text>Hello</Text>);
    expect(screen.getByText("Hello").tagName).toBe("P");
  });
});
