/**
 * components/BalanceCard.tsx  (Wallet Balance Display — Server-compatible Component)
 *
 * A presentational (stateless) component that displays the user's wallet
 * balance summary in three rows:
 *
 *  1. Unlocked Balance  — funds available for immediate use / P2P transfer
 *  2. Total Locked Balance — funds currently in a "Processing" state
 *                            (e.g. an OnRamp transaction not yet confirmed by the bank)
 *  3. Total Balance     — the sum of unlocked + locked, representing total wallet value
 *
 * Amount convention:
 *  Amounts are received in paise (×100) from the database and divided by 100
 *  before display. This avoids floating-point precision issues in the DB layer.
 *  e.g. 50000 paise → displayed as "500 INR"
 *
 * Props:
 *  amount  — the unlocked (spendable) balance in paise
 *  locked  — the locked (pending) balance in paise
 *
 * This component has NO client-side state and can be rendered as a Server
 * Component if needed (no "use client" directive required).
 */
import { Card } from "@repo/ui/card";

/**
 * BalanceCard
 *
 * Displays a three-row summary of the user's wallet balance inside a Card.
 *
 * @param amount - Unlocked balance in paise
 * @param locked - Locked (pending) balance in paise
 */
export const BalanceCard = ({amount, locked}: {
    amount: number;
    locked: number;
}) => {
    return <Card title={"Balance"}>
        {/* Row 1: Unlocked (spendable) balance */}
        <div className="flex justify-between border-b border-slate-300 pb-2">
            <div>
                Unlocked balance
            </div>
            <div>
                {/* Divide by 100 to convert paise → rupees for display */}
                {amount / 100} INR
            </div>
        </div>

        {/* Row 2: Locked / pending balance (money that is in transit from a bank) */}
        <div className="flex justify-between border-b border-slate-300 py-2">
            <div>
                Total Locked Balance
            </div>
            <div>
                {locked / 100} INR
            </div>
        </div>

        {/* Row 3: Grand total — unlocked + locked combined */}
        <div className="flex justify-between border-b border-slate-300 py-2">
            <div>
                Total Balance
            </div>
            <div>
                {/* Add both paise values first, then convert to rupees to avoid float issues */}
                {(locked + amount) / 100} INR
            </div>
        </div>
    </Card>
}
