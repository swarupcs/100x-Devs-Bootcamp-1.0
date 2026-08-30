/**
 * apps/merchant-app/app/api/auth/[...nextauth]/route.ts  (NextAuth HTTP Handler)
 *
 * Mounts the NextAuth.js request handler for the merchant-app onto the
 * Next.js App Router.
 *
 * The [...nextauth] catch-all dynamic segment intercepts every request to
 * /api/auth/* including:
 *  - GET  /api/auth/signin          → renders the sign-in page / starts OAuth flow
 *  - GET  /api/auth/signout         → renders the sign-out confirmation
 *  - GET  /api/auth/session         → returns the current session JSON
 *  - GET  /api/auth/callback/google → handles the Google OAuth redirect callback
 *  - POST /api/auth/signout         → performs the actual sign-out
 *
 * NextAuth(authOptions) creates a single handler function that processes all
 * these sub-routes internally based on the request URL.
 *
 * Both GET and POST are exported so Next.js routes HTTP requests of either
 * method to the same handler (required by the App Router).
 *
 * All configuration lives in lib/auth.ts — this file is intentionally minimal.
 */
import NextAuth from "next-auth"
import { authOptions } from "../../../../lib/auth"

// Create the NextAuth handler using the merchant-app's authOptions (Google OAuth)
const handler = NextAuth(authOptions)

// Export for both GET (page renders / session reads) and POST (form submissions / sign-out)
export { handler as GET, handler as POST }
