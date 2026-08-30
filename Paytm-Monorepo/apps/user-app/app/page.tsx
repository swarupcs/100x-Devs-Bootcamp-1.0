/**
 * app/page.tsx  (Root Page - "/" route)
 *
 * This is the entry point page for the application (rendered at "/").
 * Its sole responsibility is to redirect the user based on their authentication state:
 *
 *  - If the user is already signed in  → redirect to "/dashboard"
 *  - If the user is NOT signed in      → redirect to "/api/auth/signin"  (NextAuth login page)
 *
 * Why an async server component?
 *  `getServerSession` is a server-side function that reads the JWT/session cookie
 *  on the server before sending any HTML to the browser. This prevents a flash of
 *  unauthenticated content and makes the redirect instant (HTTP 307).
 *
 * The root "/" route itself never renders any visible UI.
 */
import { getServerSession } from "next-auth";
import { redirect } from 'next/navigation'
import { authOptions } from "./lib/auth";

/**
 * Page (Root Route Component)
 *
 * Async server component — runs entirely on the server.
 * Checks for an active session and performs a server-side redirect.
 */
export default async function Page() {
  // Retrieve the current user session from the server using our authOptions config.
  // Returns null if the user is not authenticated.
  const session = await getServerSession(authOptions);

  if (session?.user) {
    // User is authenticated → send them to the main dashboard
    redirect('/dashboard')
  } else {
    // User is not authenticated → send them to the NextAuth sign-in page
    redirect('/api/auth/signin')
  }
}
