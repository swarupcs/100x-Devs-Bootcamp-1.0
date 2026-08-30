/**
 * packages/ui/src/button.tsx  (Shared Button Component)
 *
 * A reusable, accessible button component from the shared @repo/ui package.
 * Used across the user-app (AddMoneyCard, SendCard, Appbar) and anywhere
 * else a styled button is needed in the monorepo.
 *
 * "use client" is required because this component attaches an onClick handler
 * which is a browser event — it cannot be serialised to HTML by the server.
 *
 * Styling:
 *  - Dark grey background (bg-gray-800) with hover darkening (hover:bg-gray-900)
 *  - White text, rounded corners, focus ring for accessibility
 *  - Small padding and font size — compact but clearly interactive
 *
 * Props:
 *  children — The button label (text or any React node)
 *  onClick  — Click handler called when the button is pressed
 */
"use client";

import { ReactNode } from "react";

/** Props for the Button component */
interface ButtonProps {
  children: ReactNode;   // button label (text, icon, or any JSX)
  onClick: () => void;   // click handler
}

/**
 * Button
 *
 * A styled, accessible HTML button element.
 * Uses Tailwind utility classes for a dark, rounded appearance.
 *
 * @param onClick  - Handler called on click
 * @param children - Content rendered inside the button
 */
export const Button = ({ onClick, children }: ButtonProps) => {
  return (
    <button
      onClick={onClick}
      type="button"
      // Tailwind classes:
      //  text-white bg-gray-800          → white text on dark grey background
      //  hover:bg-gray-900               → slightly darker on hover
      //  focus:outline-none focus:ring-4 focus:ring-gray-300 → accessible focus ring
      //  font-medium rounded-lg text-sm  → typography and shape
      //  px-5 py-2.5 me-2 mb-2          → spacing
      className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2"
    >
      {children}
    </button>

  );
};
