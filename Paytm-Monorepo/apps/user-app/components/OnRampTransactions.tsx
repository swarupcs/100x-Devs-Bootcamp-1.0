/**
 * components/OnRampTransactions.tsx  (OnRamp Transaction History — Server-compatible)
 *
 * A presentational (stateless) component that displays a list of the user's
 * OnRamp (bank → wallet) transactions inside a "Recent Transactions" card.
 *
 * OnRamp transactions are created when the user clicks "Add Money" and initiates
 * a top-up via a bank. Each transaction starts with status "Processing" and is
 * later updated to "Success" or "Failure" by the bank-webhook app.
 *
 * Behaviour:
 *  - If there are no transactions → renders a "No Recent transactions" message.
 *  - If there are transactions    → renders each one showing:
 *      - "Received INR" label (the direction of the money flow)
 *      - The date (human-readable via Date.toDateString())
 *      - The amount in rupees (divided by 100 from paise)
 *
 * Amount convention: amounts are received in paise (×100) and divided by 100 for display.
 *
 * Props:
 *  transactions — array of { time, amount, status, provider } objects
 *
 * Note: The `status` field type is currently `string`. A TODO exists to narrow
 * it to a union type like `"Processing" | "Success" | "Failure"` for type safety.
 *
 * This component has no state and can be used as a Server Component.
 */
import { Card } from "@repo/ui/card"

/**
 * OnRampTransactions
 *
 * Renders a card listing all of the user's bank top-up transactions.
 * Shows an empty state message when there are no transactions.
 *
 * @param transactions - Array of OnRamp transaction objects to display
 */
export const OnRampTransactions = ({
    transactions
}: {
    transactions: {
        time: Date,
        amount: number,
        // TODO: Can the type of `status` be more specific?
        // Consider: "Processing" | "Success" | "Failure"
        status: string,
        provider: string
    }[]
}) => {
    // Empty state: no transactions found for this user
    if (!transactions.length) {
        return <Card title="Recent Transactions">
            <div className="text-center pb-8 pt-8">
                No Recent transactions
            </div>
        </Card>
    }

    // Transactions exist: render each one as a row
    return <Card title="Recent Transactions">
        <div className="pt-2">
            {transactions.map((t, index) => <div key={index} className="flex justify-between">
                {/* Left side: transaction label and date */}
                <div>
                    <div className="text-sm">
                        {/* Hardcoded "Received INR" — OnRamp always means money was received */}
                        Received INR
                    </div>
                    <div className="text-slate-600 text-xs">
                        {/* Format the Date object as a human-readable string, e.g. "Mon Jan 01 2024" */}
                        {t.time.toDateString()}
                    </div>
                </div>

                {/* Right side: amount in rupees (convert from paise by dividing by 100) */}
                <div className="flex flex-col justify-center">
                    + Rs {t.amount / 100}
                </div>

            </div>)}
        </div>
    </Card>
}
