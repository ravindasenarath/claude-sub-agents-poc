import type { ReactNode } from "react";

interface HeadingProps {
  children: ReactNode;
  level?: 1 | 2 | 3;
  className?: string;
}

const HEADING_STYLES: Record<NonNullable<HeadingProps["level"]>, string> = {
  1: "text-3xl font-semibold tracking-tight",
  2: "text-2xl font-semibold tracking-tight",
  3: "text-xl font-semibold",
};

/** Shared heading primitive so heading scale/weight stays consistent across screens. */
export function Heading({ children, level = 1, className = "" }: HeadingProps) {
  const Tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
  return <Tag className={`${HEADING_STYLES[level]} ${className}`.trim()}>{children}</Tag>;
}

interface TextProps {
  children: ReactNode;
  muted?: boolean;
  className?: string;
}

/** Shared body-copy primitive. */
export function Text({ children, muted = false, className = "" }: TextProps) {
  return (
    <p className={`text-base leading-7 ${muted ? "text-[var(--color-muted)]" : ""} ${className}`.trim()}>
      {children}
    </p>
  );
}
