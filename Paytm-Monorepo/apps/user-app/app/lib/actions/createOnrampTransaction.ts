/**
 * app/lib/actions/createOnrampTransaction.ts  (Server Action)
 *
 * Server Action that creates an "OnRamp" transaction record in the database.
 * An OnRamp transaction represents money flowing INTO the wallet from an external
 * banking provider (e.g. HDFC, Axis Bank).
 *
 * Flow:
 *  1. The user selects a bank and enters an amount in <AddMoneyCard />.
 *  2. The component calls this server action.
 *  3. This action:
 *     a. Validates that the user is authenticated (returns error if not).
 *     b. Generates a random token that would normally come from the banking provider
 *        to uniquely identify the transaction on their end.
 *     c. Creates a new OnRampTransaction DB record with status "Processing".
 *  4. After this action resolves, the component redirects the user to the bank's
 *     website to complete the actual payment.
 *  5. The bank webhook (bank-webhook app) will later update the status to "Success"
 *     or "Failure" and credit the wallet balance.
 *
 * "use server" marks this as a Next.js Server Action:
 *  - It runs exclusively on the server (never bundled into client JS).
 *  - It can be called directly from client components like a normal async function.
 *  - It has access to server-only resources (database, secrets, session).
 *
 * Amount convention: stored in paise (×100) to avoid floating-point issues.
 *  e.g. ₹500 is stored as 50000.
 */
"use server";

import prisma from "@repo/db/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";

/**
 * createOnRampTransaction
 *
 * Creates a pending OnRamp transaction in the database and returns a status message.
 *
 * @param provider - The bank name selected by the user (e.g. "HDFC Bank")
 * @param amount   - The amount in RUPEES entered by the user (converted to paise internally)
 * @returns        - { message: "Done" } on success, or { message: "Unauthenticated request" } if not logged in
 */
export async function createOnRampTransaction(provider: string, amount: number) {
    // Ideally the token should come from the banking provider (hdfc/axis)

    // Ensure the user is signed in before creating any transaction
    const session = await getServerSession(authOptions);
    if (!session?.user || !session.user?.id) {
        // Return an error object (Server Actions can't throw HTTP errors directly)
        return {
            message: "Unauthenticated request"
        }
    }

    // Generate a pseudo-random token to identify this transaction.
    // In production this would be a secure token returned by the bank's API.
    const token = (Math.random() * 1000).toString();

    // Insert the OnRamp transaction record with a "Processing" status.
    // The bank webhook will update this to "Success" or "Failure" later.
    await prisma.onRampTransaction.create({
        data: {
            provider,                          // which bank was selected
            status: "Processing",              // initial status; updated by webhook
            startTime: new Date(),             // timestamp when the user initiated the top-up
            token: token,                      // unique identifier shared with the bank
            userId: Number(session?.user?.id), // link to the authenticated user
            amount: amount * 100               // convert rupees → paise (integer storage)
        }
    });

    return {
        message: "Done"
    }
}
