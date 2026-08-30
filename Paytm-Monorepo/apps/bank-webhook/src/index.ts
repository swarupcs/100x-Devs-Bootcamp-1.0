/**
 * apps/bank-webhook/src/index.ts  (Bank Webhook Express Server)
 *
 * This is a standalone Express.js HTTP server that acts as the webhook receiver
 * for bank payment callbacks. It runs on port 3003 independently of the Next.js apps.
 *
 * ─── System Architecture Context ────────────────────────────────────────────
 *
 * The full OnRamp (top-up) money flow works as follows:
 *
 *  1. User selects a bank & amount in the user-app (AddMoneyCard).
 *  2. The `createOnRampTransaction` Server Action creates a pending
 *     OnRampTransaction record in the DB (status: "Processing", with a unique token).
 *  3. The user is redirected to the bank's net-banking portal to complete payment.
 *  4. After the bank processes the payment, the bank calls THIS webhook endpoint
 *     (POST /hdfcWebhook) with the payment result.
 *  5. This webhook atomically:
 *     a. Credits the user's wallet Balance by the paid amount.
 *     b. Updates the OnRampTransaction status to "Success".
 *
 * ─── Security TODOs ──────────────────────────────────────────────────────────
 *  - The bank should send a shared secret / HMAC signature so we can verify
 *    that the webhook is genuinely from the bank and not a forged request.
 *  - Input validation with Zod should be added to the request body.
 *  - In production, this endpoint should only be reachable by the bank's IP range.
 *
 * ─── Amount Convention ───────────────────────────────────────────────────────
 *  Amounts are stored and transferred in paise (×100). The bank is expected to
 *  send the amount in paise as well. No conversion is done here.
 */
import express from "express";
import db from "@repo/db/client";

const app = express();

// Parse incoming JSON request bodies (required for reading req.body)
app.use(express.json())

/**
 * POST /hdfcWebhook
 *
 * Webhook endpoint called by HDFC Bank after processing a user's payment.
 * Atomically credits the user's wallet and marks the transaction as "Success".
 *
 * Expected request body from HDFC:
 * {
 *   token:           string  — The unique transaction token generated at transaction creation
 *   user_identifier: string  — The user's database ID (as a string)
 *   amount:          string  — The amount paid in paise (as a string)
 * }
 *
 * Responses:
 *   200 { message: "Captured" }          — Webhook processed successfully
 *   411 { message: "Error while processing webhook" } — DB error occurred
 */
app.post("/hdfcWebhook", async (req, res) => {
    //TODO: Add zod validation here?
    //TODO: HDFC bank should ideally send us a secret so we know this is sent by them

    // Extract and normalise the payment information from the request body.
    // Note: we rename `user_identifier` → `userId` for consistency in our codebase.
    const paymentInformation: {
        token: string;
        userId: string;
        amount: string
    } = {
        token: req.body.token,              // unique token matching the OnRampTransaction record
        userId: req.body.user_identifier,   // the user's DB id (sent by the bank)
        amount: req.body.amount             // payment amount in paise (as string from JSON)
    };

    try {
        // ── Atomic Prisma Transaction ─────────────────────────────────────────
        // Both operations must succeed or fail together to avoid an inconsistent
        // state (e.g. balance credited but transaction still showing "Processing").
        await db.$transaction([
            // Step 1: Credit the user's wallet balance by the paid amount
            db.balance.updateMany({
                where: {
                    userId: Number(paymentInformation.userId)  // convert string id → number
                },
                data: {
                    amount: {
                        // You can also get this from your DB
                        // Increment rather than set, in case of concurrent transactions
                        increment: Number(paymentInformation.amount)  // string → number paise
                    }
                }
            }),

            // Step 2: Mark the matching OnRampTransaction as "Success"
            // Matched by the unique token generated during transaction creation
            db.onRampTransaction.updateMany({
                where: {
                    token: paymentInformation.token  // find the transaction by its unique token
                },
                data: {
                    status: "Success",  // update from "Processing" → "Success"
                }
            })
        ]);

        // Both DB writes succeeded — acknowledge the webhook to the bank
        res.json({
            message: "Captured"
        })
    } catch(e) {
        // Log the error for debugging and respond with a failure status
        // The bank may retry the webhook on non-2xx responses
        console.error(e);
        res.status(411).json({
            message: "Error while processing webhook"
        })
    }

})

// Start the Express server on port 3003
// This must be a different port from the Next.js apps (3000 / 3001)
app.listen(3003);
