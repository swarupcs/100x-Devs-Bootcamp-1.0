/**
 * packages/ui/src/Center.tsx  (Shared Centering Layout Component)
 *
 * A simple layout utility component that centres its children both
 * horizontally and vertically within their parent container.
 *
 * Technique:
 *  - Outer div uses `flex flex-col h-full` to take up the full height
 *    of the parent and arrange children in a column.
 *  - `justify-center` on the outer div centres the inner div vertically.
 *  - Inner div uses `flex justify-center` to centre children horizontally.
 *
 * This two-div pattern is a classic flexbox approach to achieve true
 * 2D centering without needing absolute/fixed positioning.
 *
 * Usage:
 *  Wrap any content that should be centred in the page:
 *  <Center>
 *    <Card title="Send">...</Card>
 *  </Center>
 *
 * Used in:
 *  - components/SendCard.tsx (P2P transfer form)
 */
import React from "react";

/**
 * Center
 *
 * Centres its children both horizontally and vertically within
 * the parent container using Flexbox.
 *
 * @param children - Content to be centred
 */
export const Center = ({ children }: { children: React.ReactNode }) => {
    return (
        // Outer container: full height column with vertical centering
        <div className="flex justify-center flex-col h-full">
            {/* Inner container: horizontal centering */}
            <div className="flex justify-center">
                {children}
            </div>
        </div>
    )
}
