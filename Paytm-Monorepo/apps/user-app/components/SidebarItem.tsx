/**
 * components/SidebarItem.tsx  (Sidebar Navigation Link — Client Component)
 *
 * A single navigation item rendered inside the dashboard sidebar
 * (defined in app/(dashboard)/layout.tsx).
 *
 * "use client" is required because this component:
 *  - Uses `usePathname()` to read the current URL path (browser API)
 *  - Uses `useRouter()` for programmatic navigation on click
 *
 * Active-route highlighting:
 *  The component compares the current pathname with the item's `href` prop.
 *  If they match, the item and its icon are rendered in the brand purple colour
 *  (#6a51a6) to indicate the active section. Otherwise they are rendered in a
 *  muted slate grey.
 *
 * Props:
 *  href  — the route this item links to (e.g. "/dashboard", "/transfer")
 *  title — the text label displayed next to the icon
 *  icon  — a React node (SVG icon) rendered to the left of the title
 *
 * Clicking the item calls `router.push(href)` for client-side navigation
 * (no full page reload).
 */
"use client"
import { usePathname, useRouter } from "next/navigation";
import React from "react";

/**
 * SidebarItem
 *
 * Renders a clickable sidebar navigation link with an icon and label.
 * Highlights itself when the current route matches its `href`.
 *
 * @param href  - The target route path
 * @param title - Display label for the navigation item
 * @param icon  - SVG icon element shown to the left of the title
 */
export const SidebarItem = ({ href, title, icon }: { href: string; title: string; icon: React.ReactNode }) => {
    const router = useRouter();

    // Get the current URL pathname (e.g. "/transfer") to determine active state
    const pathname = usePathname()

    // `selected` is true when this item's href matches the current route
    const selected = pathname === href

    return <div
        // Apply purple colour when selected, grey when not; always show pointer cursor
        className={`flex ${selected ? "text-[#6a51a6]" : "text-slate-500"} cursor-pointer  p-2 pl-8`}
        onClick={() => {
            // Navigate to the item's route on click (client-side, no full reload)
            router.push(href);
        }}
    >
        {/* Icon container — inherits the text colour class for SVG stroke colour */}
        <div className="pr-2">
            {icon}
        </div>

        {/* Title text — bold, with the same active/inactive colour as the icon */}
        <div className={`font-bold ${selected ? "text-[#6a51a6]" : "text-slate-500"}`}>
            {title}
        </div>
    </div>
}
