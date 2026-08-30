/**
 * packages/ui/src/Appbar.tsx  (Shared Navigation Bar Component)
 *
 * A reusable top navigation bar used by BOTH the user-app and the merchant-app.
 * Being in the shared @repo/ui package means both apps get the same consistent
 * header without duplicating code.
 *
 * What it renders:
 *  - Left side:  "PayTM" brand text
 *  - Right side: A <Button /> that reads "Login" or "Logout" depending on
 *                whether `user` is defined (i.e. whether a session exists).
 *
 * The component is intentionally stateless and generic:
 *  - It does not know HOW to sign in or sign out.
 *  - The caller (AppbarClient in user-app, or page.tsx in merchant-app) passes
 *    the actual `onSignin` and `onSignout` handler functions, making this
 *    component reusable across apps with different auth strategies.
 *
 * Props:
 *  user     — Optional object with the current user's name. If undefined/null,
 *              the user is treated as unauthenticated → "Login" button is shown.
 *  onSignin — Callback fired when the user clicks "Login"
 *  onSignout — Callback fired when the user clicks "Logout"
 *
 * TODO: The `onSignin` and `onSignout` prop types are currently `any`.
 *       They should be typed more precisely (e.g. `() => void` or
 *       `(options?: SignInOptions) => Promise<SignInResponse | undefined>`).
 */
import { Button } from "./button";

/** Props for the Appbar component */
interface AppbarProps {
    user?: {
        name?: string | null;  // current user's display name (from session)
    },
    // TODO: can u figure out what the type should be here?
    onSignin: any,   // handler to initiate sign-in (e.g. NextAuth signIn())
    onSignout: any   // handler to initiate sign-out (e.g. NextAuth signOut())
}

/**
 * Appbar
 *
 * Stateless navigation bar showing the app name and a Login/Logout button.
 *
 * @param user     - Current user object (undefined if not logged in)
 * @param onSignin - Called when the Login button is clicked
 * @param onSignout - Called when the Logout button is clicked
 */
export const Appbar = ({
    user,
    onSignin,
    onSignout
}: AppbarProps) => {
    return <div className="flex justify-between border-b px-4 border-slate-300">
        {/* Brand / logo text on the left */}
        <div className="text-lg flex flex-col justify-center">
            PayTM
        </div>
        {/* Login / Logout button on the right.
            Shows "Logout" if a user session exists, "Login" otherwise. */}
        <div className="flex flex-col justify-center pt-2">
            <Button onClick={user ? onSignout : onSignin}>{user ? "Logout" : "Login"}</Button>
        </div>
    </div>
}
