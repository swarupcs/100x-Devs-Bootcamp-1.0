/**
 * app/(dashboard)/layout.tsx  (Dashboard Route Group Layout)
 *
 * This layout wraps all pages inside the "(dashboard)" route group:
 *  - /dashboard
 *  - /transfer
 *  - /transactions
 *  - /p2p
 *
 * The parentheses in "(dashboard)" make it a Next.js Route Group — the folder
 * name is NOT included in the URL path, it only organises files in the project.
 *
 * What this layout renders:
 *  - A fixed-width left sidebar (w-72) with navigation links for each section.
 *  - The active page's content ({children}) to the right of the sidebar.
 *
 * Sidebar navigation links use <SidebarItem>, which highlights the active
 * route based on the current pathname.
 *
 * SVG icons are sourced from Heroicons (https://heroicons.com/).
 * They are defined as local helper components at the bottom of this file to
 * keep the JSX clean and avoid importing an extra icon library.
 */
import { SidebarItem } from "../../components/SidebarItem";

/**
 * Layout (Dashboard Shell)
 *
 * Renders the two-column dashboard shell:
 *  Left  → sidebar with navigation items
 *  Right → the currently active page (children)
 *
 * @param children - The active dashboard page component
 */
export default function Layout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className="flex">
        {/* ── Sidebar ── */}
        {/* Fixed-width sidebar with a right border, full viewport height, top padding
            to clear the global Appbar, and a small right margin before content */}
        <div className="w-72 border-r border-slate-300 min-h-screen mr-4 pt-28">
            <div>
                {/* Home / Dashboard link */}
                <SidebarItem href={"/dashboard"} icon={<HomeIcon />} title="Home" />
                {/* Add Money / Transfer link */}
                <SidebarItem href={"/transfer"} icon={<TransferIcon />} title="Transfer" />
                {/* Transaction history link */}
                <SidebarItem href={"/transactions"} icon={<TransactionsIcon />} title="Transactions" />
                {/* Peer-to-peer transfer link */}
                <SidebarItem href={"/p2p"} icon={<P2PTransferIcon />} title="P2P Transfer" />
            </div>
        </div>
        {/* ── Main content area ── */}
        {/* The currently active dashboard page is rendered here */}
            {children}
    </div>
  );
}

// ─── Icon Components ────────────────────────────────────────────────────────
// Icons fetched from https://heroicons.com/
// Each is a tiny SVG-based React component used inline in <SidebarItem>.

/** House icon representing the main Dashboard / Home page */
function HomeIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
  </svg>
}

/** Bidirectional arrows icon representing the Transfer (Add Money) page */
function TransferIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
}

/** Clock icon representing the Transactions (history) page */
function TransactionsIcon() {
    return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>

}

/** Arrow icon representing the P2P Transfer page */
function P2PTransferIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
  </svg>
}
