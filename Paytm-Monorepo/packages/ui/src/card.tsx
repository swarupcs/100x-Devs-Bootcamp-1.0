/**
 * packages/ui/src/card.tsx  (Shared Card Layout Component)
 *
 * A reusable content card used throughout the user-app to visually group
 * related UI sections. Examples of usage:
 *  - <BalanceCard />         — wallet balance summary
 *  - <OnRampTransactions />  — recent transaction list
 *  - <AddMoneyCard />        — bank top-up form
 *  - <SendCard />            — P2P transfer form
 *
 * Structure:
 *  ┌────────────────────────┐
 *  │  Title (h1 + border)   │
 *  │  children content      │
 *  └────────────────────────┘
 *
 * Styling:
 *  - White/light grey background (#ededed) with a border and rounded corners
 *  - Generous padding (p-6) for internal breathing room
 *  - Title is a semantic <h1> with a bottom border to visually separate it
 *    from the body content
 *
 * Props:
 *  title    — The card's heading text
 *  children — Optional body content rendered below the title
 */
import React, { type JSX } from "react";

/**
 * Card
 *
 * A bordered, padded container with a titled header section.
 * Used to visually group related content in the dashboard.
 *
 * @param title    - Heading displayed at the top of the card
 * @param children - Optional body content rendered below the title
 * @returns JSX.Element
 */
export function Card({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}): JSX.Element {
  return (
    <div
      // Tailwind classes:
      //  border p-6          → outlined card with inner padding
      //  bg-white rounded-xl → white base with rounded corners
      //  bg-[#ededed]        → overrides to a light grey background (Tailwind JIT custom value)
      className="border p-6 bg-white rounded-xl bg-[#ededed]"
    >
      {/* Card title — semantic h1 with a bottom border as a visual divider */}
      <h1 className="text-xl border-b pb-2">
        {title}
      </h1>
      {/* Card body — any child components/content */}
      <div>{children}</div>
    </div>
  );
}
