import type { ElementType, ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
  /** Render as a different element than the default `div`, e.g. `main`. */
  as?: ElementType;
}

/**
 * Shared page-content wrapper: centers content, caps its width, and applies
 * responsive horizontal padding (NFR5). Downstream screens should compose
 * their layouts from this rather than hard-coding max-widths/padding.
 */
export function Container({ children, className = "", as: As = "div" }: ContainerProps) {
  return (
    <As className={`mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 ${className}`.trim()}>
      {children}
    </As>
  );
}
