/**
 * provider.tsx
 *
 * This file defines the global "Providers" wrapper component that wraps the
 * entire Next.js application (in layout.tsx) with the necessary context providers.
 *
 * Two providers are stacked here:
 * 1. RecoilRoot  - Enables Recoil state management across the whole app.
 *                  Any component can use Recoil atoms/selectors without extra setup.
 * 2. SessionProvider - Supplies the NextAuth.js session to all client components.
 *                      Without this, `useSession()` would return null on the client.
 *
 * "use client" is required here because both RecoilRoot and SessionProvider rely
 * on React context (browser APIs), which are not available during server-side rendering.
 */
"use client"
import { RecoilRoot } from "recoil";
import { SessionProvider } from "next-auth/react";

/**
 * Providers component
 *
 * Wraps child components with:
 *  - RecoilRoot: global Recoil state store
 *  - SessionProvider: makes the NextAuth session accessible via `useSession()`
 *
 * @param children - Any React nodes that need access to these contexts
 */
export const Providers = ({children}: {children: React.ReactNode}) => {
    return <RecoilRoot>
        <SessionProvider>
            {children}
        </SessionProvider>
    </RecoilRoot>
}
