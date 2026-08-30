/**
 * components/AppbarClient.tsx  (Global Navigation Bar — Client Component)
 *
 * Renders the application's top navigation bar using the shared <Appbar /> UI
 * component from the "@repo/ui" package. Because it needs live session data
 * and routing functionality (both browser APIs), it must be a client component.
 *
 * "use client" tells Next.js to include this component in the client-side JS
 * bundle so it can use React hooks and browser APIs.
 *
 * What it does:
 *  - Reads the current NextAuth session with `useSession()` to decide whether
 *    to show a "Sign In" or "Sign Out" button (handled inside <Appbar />).
 *  - Passes an `onSignin` handler → calls NextAuth's `signIn()` to open the
 *    sign-in page.
 *  - Passes an `onSignout` handler → calls NextAuth's `signOut()` then
 *    redirects the user back to the sign-in page so they're not left on a
 *    protected route.
 *  - Passes the current `user` object to <Appbar /> for display (e.g. name/avatar).
 *
 * This component is rendered in app/layout.tsx so it appears on every page.
 */
"use client"
import { signIn, signOut, useSession } from "next-auth/react";
import { Appbar } from "@repo/ui/appbar";
import { useRouter } from "next/navigation";

/**
 * AppbarClient
 *
 * Client component that renders the global top navigation bar with
 * sign-in / sign-out functionality and the current user's information.
 */
export function AppbarClient() {
  // `useSession` returns the current NextAuth session object.
  // session.data is null when the user is not signed in.
  const session = useSession();

  // useRouter gives us programmatic navigation after sign-out
  const router = useRouter();

  return (
   <div>
      <Appbar
        // Called when the user clicks "Sign In" — opens the NextAuth sign-in page
        onSignin={signIn}

        // Called when the user clicks "Sign Out":
        //  1. Signs the user out via NextAuth (clears the session cookie)
        //  2. Redirects to the sign-in page to prevent access to protected routes
        onSignout={async () => {
          await signOut()
          router.push("/api/auth/signin")
        }}

        // Pass the current user object so <Appbar /> can display their name/avatar.
        // Optional chaining handles the unauthenticated (null) case gracefully.
        user={session.data?.user}
      />
   </div>
  );
}
