/**
 * apps/merchant-app/lib/auth.ts  (NextAuth Configuration — Merchant App)
 *
 * Defines the `authOptions` object used to configure NextAuth.js for the
 * merchant-facing application.
 *
 * Key difference from the user-app:
 *  The user-app uses a Credentials Provider (phone + password).
 *  The merchant-app uses Google OAuth — merchants sign in with their Google
 *  account, which is more appropriate for a business-facing product.
 *
 * Authentication Strategy: Google OAuth 2.0
 *
 * Sign-in flow (via `signIn` callback):
 *  1. The merchant clicks "Login" → redirected to Google OAuth consent screen.
 *  2. After Google authenticates, NextAuth calls the `signIn` callback with
 *     the user's Google profile ({ user, account }).
 *  3. The callback validates that the user object and email exist.
 *  4. It upserts a Merchant record in the database:
 *     - If a merchant with this email exists → update their name and auth_type.
 *     - If not → create a new Merchant record with email, name, and auth_type "Google".
 *  5. Returns `true` to allow sign-in, or `false` to deny it.
 *
 * The `upsert` pattern ensures that:
 *  - First-time Google sign-in auto-registers the merchant.
 *  - Subsequent sign-ins update any changed profile info (e.g. display name).
 *
 * Environment variables required:
 *  GOOGLE_CLIENT_ID     — OAuth client ID from Google Cloud Console
 *  GOOGLE_CLIENT_SECRET — OAuth client secret from Google Cloud Console
 *  NEXTAUTH_SECRET      — JWT signing secret (use a strong random string in prod)
 */
import db from "@repo/db/client";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
    providers: [
        // Google OAuth 2.0 provider — credentials come from Google Cloud Console
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",       // OAuth client ID
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "" // OAuth client secret
        })
    ],
    callbacks: {
        /**
         * signIn callback
         *
         * Called by NextAuth immediately after the OAuth provider authenticates the user.
         * We use this to sync the Google profile with our own Merchant table in the DB.
         *
         * @param user    - The Google user profile (id, name, email, image)
         * @param account - The OAuth account details (provider, access_token, etc.)
         * @returns true to allow sign-in, false to deny
         */
        async signIn({ user, account }: any) {
            console.log("hi signin")  // debug log (can be removed in production)

            // Guard: if the Google account has no email, deny sign-in
            if (!user || !user.email) {
                return false;
            }

            // Upsert the merchant record: create on first sign-in, update on repeat sign-ins
            await db.merchant.upsert({
                select: {
                    id: true  // only fetch the id; we don't need the full record back
                },
                where: {
                    email: user.email  // find merchant by their Google email
                },
                create: {
                    // New merchant — populate with Google profile data
                    email: user.email,
                    name: user.name,
                    auth_type: "Google"
                },
                update: {
                    // Existing merchant — refresh name and auth_type in case they changed
                    name: user.name,
                    auth_type: "Google"
                }
            });

            // Allow the sign-in to proceed
            return true;
        }
    },
    // JWT signing secret — must be a strong random value in production
    secret: process.env.NEXTAUTH_SECRET || "secret"
}
