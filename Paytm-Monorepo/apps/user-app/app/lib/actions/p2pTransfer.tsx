/**
 * app/lib/actions/p2pTransfer.tsx  (Server Action)
 *
 * Server Action that transfers money from the currently logged-in user to another
 * user identified by their phone number. This is a Peer-to-Peer (P2P) transfer.
 *
 * "use server" marks this as a Next.js Server Action — it runs only on the server,
 * has full access to the database and session, and can be called from client
 * components as if it were a regular async function.
 *
 * Critical Design — Database Transaction with Row-Level Locking:
 * ---------------------------------------------------------------
 * Money transfers are inherently sensitive to race conditions. If two simultaneous
 * transfers try to debit the same account, both could read the same balance and
 * incorrectly allow a double-spend.
 *
 * To prevent this, we use `prisma.$transaction` (interactive transaction) combined
 * with a `SELECT ... FOR UPDATE` raw SQL query:
 *
 *  1. `SELECT ... FOR UPDATE` acquires a row-level write lock on the sender's
 *     Balance row. Other concurrent transactions that also try to read or write
 *     that row will BLOCK until this transaction completes.
 *  2. Inside the same atomic transaction:
 *     a. Re-read the sender's balance (guaranteed to be the latest value).
 *     b. Throw if balance is insufficient → transaction rolls back automatically.
 *     c. Decrement sender's balance.
 *     d. Increment recipient's balance.
 *     e. Create a P2PTransfer audit record.
 *  3. All four DB writes either commit together or roll back together — no partial state.
 *
 * Amount convention: the caller passes the amount already in paise (×100).
 *  e.g. ₹500 is passed as 50000.
 */
"use server"
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import prisma from "@repo/db/client";

/**
 * p2pTransfer
 *
 * Transfers `amount` paise from the logged-in user to the user with phone number `to`.
 * Uses a database-level transaction with a pessimistic row lock to prevent race conditions.
 *
 * @param to     - The recipient's phone number (used to look up their user record)
 * @param amount - Amount to transfer in PAISE (integer; e.g. 50000 = ₹500)
 * @returns      - { message: string } on error, or undefined on success
 */
export async function p2pTransfer(to: string, amount: number) {
    // Get the current user's session to identify the sender
    const session = await getServerSession(authOptions);
    const from = session?.user?.id; // sender's database user id (as a string)

    if (!from) {
        // Not authenticated — cannot proceed
        return {
            message: "Error while sending"
        }
    }

    // Look up the recipient by their phone number
    const toUser = await prisma.user.findFirst({
        where: {
            number: to
        }
    });

    if (!toUser) {
        // Recipient phone number not found in the system
        return {
            message: "User not found"
        }
    }

    // --- Atomic database transaction with pessimistic locking ---
    await prisma.$transaction(async (tx) => {
        // Step 1: Acquire a row-level write lock on the sender's Balance row.
        // This prevents concurrent transactions from reading a stale balance
        // until this transaction is complete (committed or rolled back).
        await tx.$queryRaw`SELECT * FROM "Balance" WHERE "userId" = ${Number(from)} FOR UPDATE`;

        // Step 2: Re-read the sender's balance AFTER acquiring the lock.
        // This ensures we are working with the most up-to-date balance.
        const fromBalance = await tx.balance.findUnique({
            where: { userId: Number(from) },
          });

          // Step 3: Guard against insufficient funds.
          // Throw so Prisma rolls back all changes made so far in this transaction.
          if (!fromBalance || fromBalance.amount < amount) {
            throw new Error('Insufficient funds');
          }

          // Step 4: Debit the sender's balance
          await tx.balance.update({
            where: { userId: Number(from) },
            data: { amount: { decrement: amount } },
          });

          // Step 5: Credit the recipient's balance
          await tx.balance.update({
            where: { userId: toUser.id },
            data: { amount: { increment: amount } },
          });

          // Step 6: Create an audit record of the P2P transfer for history/logging
          await tx.p2pTransfer.create({
            data: {
                fromUserId: Number(from),  // sender's user id
                toUserId: toUser.id,       // recipient's user id
                amount,                    // amount in paise
                timestamp: new Date()      // when the transfer happened
            }
          })
    });
    // If any step above throws, Prisma automatically rolls back the entire transaction.
}
