import type { ReactNode } from "react";

const GAP_CLASSES = {
  1: "gap-1",
  2: "gap-2",
  3: "gap-3",
  4: "gap-4",
  6: "gap-6",
  8: "gap-8",
} as const;

interface StackProps {
  children: ReactNode;
  /** Spacing between items, keyed to the shared spacing scale (src/app/globals.css). */
  gap?: keyof typeof GAP_CLASSES;
  direction?: "row" | "column";
  className?: string;
}

/**
 * Minimal flex-layout primitive for consistent spacing between stacked or
 * inline elements. Not a full layout system — compose with Tailwind
 * utilities for anything more specific.
 */
export function Stack({ children, gap = 4, direction = "column", className = "" }: StackProps) {
  const directionClass = direction === "row" ? "flex-row" : "flex-col";
  return (
    <div className={`flex ${directionClass} ${GAP_CLASSES[gap]} ${className}`.trim()}>
      {children}
    </div>
  );
}
