/**
 * app/api/user/route.ts  (GET /api/user)
 *
 * A simple API route that returns the currently authenticated user's session data.
 * Useful for client-side code that needs to fetch user information (id, name, email)
 * via a plain HTTP request rather than using the `useSession` hook.
 *
 * Behaviour:
 *  - Authenticated  → HTTP 200 with { user: { id, name, email } }
 *  - Unauthenticated → HTTP 403 with { message: "You are not logged in" }
 *
 * This route is server-side only; `getServerSession` reads the session cookie
 * securely without exposing the JWT secret to the browser.
 */
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server";
import { authOptions } from "../../lib/auth";

/**
 * GET handler for /api/user
 *
 * Returns the logged-in user's session data, or a 403 error if not authenticated.
 */
export const GET = async () => {
    // Read the current session from the incoming request's cookies
    const session = await getServerSession(authOptions);

    if (session?.user) {
        // User is authenticated — return their session data as JSON
        return NextResponse.json({
            user: session.user
        })
    }

    // User is not authenticated — return a 403 Forbidden response
    return NextResponse.json({
        message: "You are not logged in"
    }, {
        status: 403
    })
}
