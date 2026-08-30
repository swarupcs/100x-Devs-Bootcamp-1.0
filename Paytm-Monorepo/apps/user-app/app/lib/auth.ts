/**
 * app/lib/auth.ts  (NextAuth Configuration)
 *
 * This file exports `authOptions`, the central NextAuth.js configuration object.
 * It is imported by:
 *  - app/api/auth/[...nextauth]/route.ts  → mounts the NextAuth HTTP handler
 *  - Server components / actions            → call `getServerSession(authOptions)`
 *
 * Authentication Strategy: Credentials Provider (phone + password)
 *
 * Sign-up / Sign-in flow (combined in `authorize`):
 *  1. Incoming credentials: { phone, password }
 *  2. Look up the user in the DB by phone number.
 *     a. User EXISTS  → validate the supplied password against the stored bcrypt hash.
 *                       Return user object on success, null on mismatch.
 *     b. User NOT FOUND → create a new user record (auto sign-up) with a hashed
 *                         password, then return the new user object.
 *  3. Any errors during creation are caught and logged; null is returned so
 *     NextAuth shows an authentication error to the user.
 *
 * Session Callback:
 *  By default NextAuth does not expose the database user id in the session.
 *  The `session` callback copies `token.sub` (the JWT subject, which is the user id)
 *  into `session.user.id` so that server components can access it via
 *  `session.user.id`.
 *
 * Security notes:
 *  - Passwords are hashed with bcrypt (cost factor 10) before storage.
 *  - JWT_SECRET should be set in .env for production; falls back to "secret" in dev.
 *  - TODO: add Zod input validation and OTP verification before the DB queries.
 */
import db from "@repo/db/client";
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcrypt";

export const authOptions = {
    providers: [
      CredentialsProvider({
          // Display name shown on the auto-generated NextAuth sign-in page
          name: 'Credentials',
          // Field definitions for the auto-generated sign-in form
          credentials: {
            phone: { label: "Phone number", type: "text", placeholder: "1231231231", required: true },
            password: { label: "Password", type: "password", required: true }
          },
          // TODO: User credentials type from next-auth
          /**
           * authorize() is called by NextAuth when the user submits the sign-in form.
           * Must return a user object (to create a session) or null (to deny access).
           *
           * @param credentials - { phone, password } from the sign-in form
           */
          async authorize(credentials: any) {
            // Do zod validation, OTP validation here

            // Hash the incoming password. Used only when creating a NEW user.
            // For existing users we use bcrypt.compare() instead (see below).
            const hashedPassword = await bcrypt.hash(credentials.password, 10);

            // Check if a user with this phone number already exists in the database
            const existingUser = await db.user.findFirst({
                where: {
                    number: credentials.phone
                }
            });

            if (existingUser) {
                // --- Existing user: validate password ---
                if (!existingUser.password) {
                    // Account has no password stored (e.g. OAuth-only account) — deny access
                    return null;
                }
                // Compare the plain-text password against the stored bcrypt hash
                const passwordValidation = await bcrypt.compare(credentials.password, existingUser.password);
                if (passwordValidation) {
                    // Password matches — return a minimal user object for the session
                    return {
                        id: existingUser.id.toString(),
                        name: existingUser.name,
                        email: existingUser.number  // email field repurposed to store the phone number
                    }
                }
                // Password mismatch — deny access
                return null;
            }

            // --- New user: auto sign-up ---
            try {
                // Create a new user record with the provided phone number and hashed password
                const user = await db.user.create({
                    data: {
                        number: credentials.phone,
                        password: hashedPassword
                    }
                });
            
                // Return the newly created user's data to establish a session
                return {
                    id: user.id.toString(),
                    name: user.name,
                    email: user.number  // phone number stored in email field for NextAuth compatibility
                }
            } catch(e) {
                // Log DB errors (e.g. unique constraint violation) and deny access
                console.error(e);
            }

            return null
          }
        })
    ],
    // JWT signing secret — must be a strong random string in production
    secret: process.env.JWT_SECRET || "secret",
    callbacks: {
        // TODO: can we fix the type here? Using any is bad
        /**
         * session callback — runs every time a session is checked (getServerSession, useSession).
         * Enriches the session object with the user's database id from the JWT token.
         *
         * @param token   - The decoded JWT (contains `sub` = user id set at sign-in)
         * @param session - The session object exposed to client/server components
         */
        async session({ token, session }: any) {
            // Copy the JWT subject (user id) into session.user.id
            session.user.id = token.sub
            return session
        }
    }
  }
