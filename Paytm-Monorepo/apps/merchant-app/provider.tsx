/**
 * apps/merchant-app/provider.tsx  (Global Providers — Client Component)
 *
 * Identical in structure to the user-app provider, this file wraps the
 * entire merchant-app with two React context providers:
 *
 * 1. RecoilRoot      — Initialises the Recoil global state store.
 *                      Required by any component that uses Recoil atoms or selectors.
 * 2. SessionProvider — Makes the NextAuth.js session available to all client
 *                      components via the `useSession()` hook.
 *
 * "use client" is mandatory because both RecoilRoot and SessionProvider use
 * React context which relies on browser APIs unavailable during SSR.
 *
 * This component is referenced in app/layout.tsx to wrap the full page tree.
 */
"use client"
import { RecoilRoot } from "recoil";
import { SessionProvider } from "next-auth/react";

/**
 * Providers
 *
 * Wraps children with Recoil state management and NextAuth session context.
 *
 * @param children - Any React nodes that need access to global state / auth
 */
export const Providers = ({children}: {children: React.ReactNode}) => {
    return <RecoilRoot>
        <SessionProvider>
            {children}
        </SessionProvider>
    </RecoilRoot>
}
