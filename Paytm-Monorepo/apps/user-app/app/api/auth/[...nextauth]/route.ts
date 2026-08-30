/**
 * app/api/auth/[...nextauth]/route.ts  (NextAuth HTTP Handler)
 *
 * This file mounts the NextAuth.js request handler onto the Next.js App Router.
 *
 * How it works:
 *  - The [...nextauth] catch-all dynamic segment matches every request that starts
 *    with /api/auth/ (e.g. /api/auth/signin, /api/auth/signout, /api/auth/session,
 *    /api/auth/callback/credentials, etc.)
 *  - NextAuth(authOptions) returns a request handler function that understands all
 *    of these sub-routes internally.
 *  - We export the same handler for both GET and POST HTTP methods because NextAuth
 *    uses GET for page redirects / session checks and POST for form submissions.
 *
 * No business logic lives here — everything is configured in app/lib/auth.ts.
 */
import NextAuth from "next-auth"
import { authOptions } from "../../../lib/auth"

// Create the NextAuth handler using the shared authOptions configuration
const handler = NextAuth(authOptions)

// Export the handler for both GET and POST requests.
// Next.js App Router requires named HTTP-method exports from route files.
export { handler as GET, handler as POST }
