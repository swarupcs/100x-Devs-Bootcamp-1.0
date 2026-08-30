/**
 * apps/merchant-app/app/page.tsx  (Root Merchant Page — "/")
 *
 * The main landing page for the merchant-app.
 * Unlike the user-app's root page (which only redirects), this page renders
 * the top navigation bar directly and serves as the merchant dashboard entry.
 *
 * "use client" is required because:
 *  - `useSession()` is a React hook that reads the NextAuth session on the
 *    client side. Hooks cannot be used in Server Components.
 *
 * What it renders:
 *  - <Appbar /> from the shared @repo/ui package
 *    - Shows the app name ("PayTM") on the left
 *    - Shows a Login/Logout button on the right, depending on session state
 *    - onSignin → calls NextAuth's `signIn()` (redirects to Google OAuth)
 *    - onSignout → calls NextAuth's `signOut()` (ends the session)
 *
 * Note: Unlike the user-app's AppbarClient, there is no post-signout redirect
 * here — the user stays on the same "/" page after signing out.
 *
 * The merchant dashboard content (transaction history, earnings, etc.) would
 * be added below the Appbar in future iterations.
 */
"use client";
import { signIn, signOut, useSession } from "next-auth/react";
import { Appbar } from "@repo/ui/appbar";

/**
 * Page (Merchant Root Page)
 *
 * Client component — uses `useSession` to get the current auth state
 * and renders the top navigation bar with sign-in / sign-out handlers.
 */
export default function Page(): JSX.Element {
  // `useSession` returns the current NextAuth session from the browser cookie.
  // session.data is null when the user is not authenticated.
  const session = useSession();

  return (
   <div>
      {/* Appbar renders "PayTM" logo + Login/Logout button */}
      <Appbar
        // Trigger Google OAuth sign-in flow
        onSignin={signIn}
        // End the current merchant session
        onSignout={signOut}
        // Pass the user object so Appbar knows whether to show Login or Logout
        user={session.data?.user}
      />
   </div>
  );
}
