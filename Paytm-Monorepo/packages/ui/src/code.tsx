/**
 * packages/ui/src/code.tsx  (Shared Inline Code Component)
 *
 * A thin wrapper around the HTML <code> element, exported from @repo/ui
 * for use wherever inline code formatting is needed.
 *
 * Why a wrapper component?
 *  - Provides a consistent, typed interface across the monorepo.
 *  - Allows a custom `className` to be passed for additional Tailwind styling.
 *  - Can be extended later (e.g. syntax highlighting, copy button) without
 *    changing every call site.
 *
 * Currently used for displaying code snippets or monospace-formatted text
 * in documentation or UI sections.
 *
 * Props:
 *  children  — The code content (text or nested JSX) to render inside <code>
 *  className — Optional CSS class string for additional styling (e.g. Tailwind utilities)
 */
import { type JSX } from "react";

/**
 * Code
 *
 * Renders children inside an HTML <code> element with optional custom classes.
 *
 * @param children  - Content to display as inline code
 * @param className - Optional Tailwind / CSS class names for custom styling
 * @returns JSX.Element
 */
export function Code({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): JSX.Element {
  // Render a semantic <code> element — browsers apply monospace font by default
  return <code className={className}>{children}</code>;
}
