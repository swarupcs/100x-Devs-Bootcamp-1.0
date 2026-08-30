/**
 * components/AddMoneyCard.tsx  (Add Money / OnRamp Form — Client Component)
 *
 * A client-side form that lets the authenticated user top up their wallet
 * balance by initiating an OnRamp transaction through a supported bank.
 *
 * "use client" is required because this component manages local state with
 * `useState` and responds to user interactions (onChange, onClick).
 *
 * Supported banks are listed in `SUPPORTED_BANKS`. Each bank has a name (used
 * as the provider label stored in the DB) and a redirectUrl (the bank's
 * net-banking portal where the actual payment is completed).
 *
 * User flow:
 *  1. User enters an amount in the text input.
 *  2. User selects a bank from the dropdown (defaults to HDFC Bank).
 *  3. User clicks "Add Money":
 *     a. Calls `createOnRampTransaction(provider, amount)` — a Server Action
 *        that creates a pending OnRampTransaction record in the DB.
 *     b. Redirects the browser to the selected bank's net-banking URL so the
 *        user can complete the actual payment.
 *  4. After the bank processes the payment, the bank-webhook app receives a
 *     callback and updates the transaction status + credits the wallet balance.
 *
 * State:
 *  - `redirectUrl` — the bank's URL, used after the DB record is created
 *  - `provider`    — the bank name, stored in the DB as the transaction provider
 *  - `value`       — the amount (in rupees) entered by the user
 */
"use client"
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import { TextInput } from "@repo/ui/textinput";
import { createOnRampTransaction } from "../app/lib/actions/createOnrampTransaction";

/**
 * List of banks supported for OnRamp (wallet top-up).
 * name        → display label in the dropdown & stored as `provider` in the DB
 * redirectUrl → net-banking URL the user is sent to after initiating the transaction
 */
const SUPPORTED_BANKS = [{
    name: "HDFC Bank",
    redirectUrl: "https://netbanking.hdfcbank.com"
}, {
    name: "Axis Bank",
    redirectUrl: "https://www.axisbank.com/"
}];

/**
 * AddMoney Component
 *
 * Renders the "Add Money" card form. Manages the selected bank and amount
 * via local state and triggers the Server Action on form submission.
 */
export const AddMoney = () => {
    // Track the redirect URL for the currently selected bank (defaults to HDFC)
    const [redirectUrl, setRedirectUrl] = useState(SUPPORTED_BANKS[0]?.redirectUrl);

    // Track the provider name for the currently selected bank (used in DB record)
    const [provider, setProvider] = useState(SUPPORTED_BANKS[0]?.name || "");

    // Track the amount entered by the user (in rupees, stored as a number)
    const [value, setValue] = useState(0)

    return <Card title="Add Money">
    <div className="w-full">
        {/* Amount input — converts the string input value to a number */}
        <TextInput label={"Amount"} placeholder={"Amount"} onChange={(val) => {
            setValue(Number(val))
        }} />

        {/* Label for the bank selector */}
        <div className="py-4 text-left">
            Bank
        </div>

        {/* Bank selector dropdown — updates both redirectUrl and provider state */}
        <Select onSelect={(value) => {
            // Find the matching bank object and update both pieces of state
            setRedirectUrl(SUPPORTED_BANKS.find(x => x.name === value)?.redirectUrl || "");
            setProvider(SUPPORTED_BANKS.find(x => x.name === value)?.name || "");
        }} options={SUPPORTED_BANKS.map(x => ({
            key: x.name,   // unique key for each option
            value: x.name  // display label shown in the dropdown
        }))} />

        {/* Submit button — creates the DB record then redirects to the bank */}
        <div className="flex justify-center pt-4">
            <Button onClick={async () => {
                // Step 1: Create a "Processing" OnRamp transaction in the database
                await createOnRampTransaction(provider, value)
                // Step 2: Redirect the user to the bank's net-banking portal
                // to complete the actual payment
                window.location.href = redirectUrl || "";
            }}>
            Add Money
            </Button>
        </div>
    </div>
</Card>
}
