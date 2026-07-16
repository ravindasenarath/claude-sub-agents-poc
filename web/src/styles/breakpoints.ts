/**
 * Responsive breakpoints (NFR5 — usable on desktop and mobile browsers).
 *
 * These values mirror Tailwind's default breakpoint scale so that the
 * `sm:`/`md:`/`lg:`/`xl:` utility prefixes used throughout the app stay in
 * sync with the numbers referenced here for JS-side responsive logic (e.g. a
 * future `useMediaQuery` hook). If Tailwind's theme is ever customized, keep
 * these two sources in sync.
 *
 * Keep this list minimal — add a breakpoint only when a real layout need
 * requires it.
 */
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** Media query string helper, e.g. `mediaQuery("md")` -> "(min-width: 768px)". */
export function mediaQuery(breakpoint: Breakpoint): string {
  return `(min-width: ${breakpoints[breakpoint]}px)`;
}
