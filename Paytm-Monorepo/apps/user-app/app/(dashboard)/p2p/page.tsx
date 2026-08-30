/**
 * app/(dashboard)/p2p/page.tsx  (P2P Transfer Page — "/p2p")
 *
 * Renders the Peer-to-Peer (P2P) money transfer page.
 * The page is a full-width container that holds the <SendCard /> component.
 *
 * <SendCard /> provides:
 *  - A phone number input (to identify the recipient)
 *  - An amount input
 *  - A "Send" button that triggers the `p2pTransfer` server action
 *
 * This page is wrapped by app/(dashboard)/layout.tsx which provides the
 * sidebar navigation shell around it.
 */
import { SendCard } from "../../../components/SendCard";

/**
 * P2P Page Component
 *
 * Simple wrapper that renders the P2P transfer UI centred in the main content area.
 */
export default function() {
    return <div className="w-full">
        {/* SendCard renders the full P2P transfer form */}
        <SendCard />
    </div>
}
