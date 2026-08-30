/**
 * app/(dashboard)/transfer/page.tsx  (Transfer Page — "/transfer")
 *
 * This is a Next.js async Server Component that renders the "Add Money" (OnRamp)
 * transfer page. It fetches the user's current wallet balance and their OnRamp
 * transaction history from the database on the server before rendering any HTML.
 *
 * Data fetching (server-side):
 *  - `getBalance()`              → reads the user's Balance row from the DB
 *  - `getOnRampTransactions()`   → reads all OnRamp transactions for the user
 *
 * Why server-side fetching?
 *  - No loading spinners — data is ready before the page is sent to the browser.
 *  - Secure — DB queries run on the server; the Prisma client is never exposed.
 *  - Session is read server-side via `getServerSession`, so no client cookie access needed.
 *
 * Layout:
 *  - Responsive 1-column → 2-column grid (md breakpoint):
 *    Left  → <AddMoney />         (client component: bank selector + amount input)
 *    Right → <BalanceCard />      (shows unlocked, locked, and total balance)
 *             <OnRampTransactions /> (lists recent OnRamp transactions)
 *
 * Amount convention: the DB stores values in paise (×100).
 *  The child components are responsible for dividing by 100 before display.
 */
import prisma from "@repo/db/client";
import { AddMoney } from "../../../components/AddMoneyCard";
import { BalanceCard } from "../../../components/BalanceCard";
import { OnRampTransactions } from "../../../components/OnRampTransactions";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";

/**
 * getBalance (private server helper)
 *
 * Fetches the authenticated user's wallet balance from the database.
 * Returns { amount, locked } both in paise, defaulting to 0 if no record exists.
 */
async function getBalance() {
    const session = await getServerSession(authOptions);
    const balance = await prisma.balance.findFirst({
        where: {
            userId: Number(session?.user?.id)
        }
    });
    return {
        amount: balance?.amount || 0,   // available (unlocked) balance in paise
        locked: balance?.locked || 0    // locked/pending balance in paise
    }
}

/**
 * getOnRampTransactions (private server helper)
 *
 * Fetches all OnRamp (bank → wallet) transactions for the authenticated user.
 * Maps the raw Prisma records to a simpler shape consumed by <OnRampTransactions />.
 *
 * @returns Array of { time, amount, status, provider } objects
 */
async function getOnRampTransactions() {
    const session = await getServerSession(authOptions);
    const txns = await prisma.onRampTransaction.findMany({
        where: {
            userId: Number(session?.user?.id)
        }
    });
    // Map the full Prisma model to only the fields the UI component needs
    return txns.map(t => ({
        time: t.startTime,   // Date object when the user initiated the top-up
        amount: t.amount,    // amount in paise
        status: t.status,    // "Processing" | "Success" | "Failure"
        provider: t.provider // bank name (e.g. "HDFC Bank")
    }))
}

/**
 * Transfer Page Component (default export)
 *
 * Async server component — fetches balance + transactions in parallel,
 * then renders the transfer page layout.
 */
export default async function() {
    // Fetch balance and transaction data concurrently on the server
    const balance = await getBalance();
    const transactions = await getOnRampTransactions();

    return <div className="w-screen">
        {/* Page heading */}
        <div className="text-4xl text-[#6a51a6] pt-8 mb-8 font-bold">
            Transfer
        </div>
        {/* Responsive grid: 1 col on mobile, 2 cols on md+ screens */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 p-4">
            {/* Left column: Add Money form (select bank, enter amount, click Add) */}
            <div>
                <AddMoney />
            </div>
            {/* Right column: Balance summary + recent OnRamp transaction list */}
            <div>
                {/* Shows unlocked, locked, and total balance (divides paise by 100) */}
                <BalanceCard amount={balance.amount} locked={balance.locked} />
                <div className="pt-4">
                    {/* Lists recent bank top-up transactions */}
                    <OnRampTransactions transactions={transactions} />
                </div>
            </div>
        </div>
    </div>
}
