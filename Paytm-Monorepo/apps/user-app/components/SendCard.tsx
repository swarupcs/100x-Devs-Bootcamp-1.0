/**
 * components/SendCard.tsx  (P2P Money Transfer Form — Client Component)
 *
 * A client-side form that lets the authenticated user send money directly to
 * another user by their phone number (Peer-to-Peer transfer).
 *
 * "use client" is required because this component:
 *  - Manages form field values with `useState`
 *  - Responds to user input events (onChange, onClick)
 *
 * User flow:
 *  1. User enters the recipient's phone number.
 *  2. User enters the amount they want to send (in rupees).
 *  3. User clicks "Send":
 *     a. Calls `p2pTransfer(number, amount * 100)` — a Server Action.
 *        The amount is multiplied by 100 to convert rupees → paise before
 *        being passed to the action (which expects paise).
 *     b. The Server Action validates the session, looks up the recipient,
 *        acquires a DB row lock, checks sufficient funds, then atomically
 *        debits the sender and credits the recipient.
 *
 * State:
 *  - `number` — the recipient's phone number (string input)
 *  - `amount` — the amount to transfer (string input, converted to number on submit)
 *
 * Styling:
 *  - The outer div takes full viewport height (h-[90vh]) to vertically centre
 *    the <Center> container, which centres the card both horizontally and vertically.
 */
"use client"
import { Button } from "@repo/ui/button";
import { Card } from "@repo/ui/card";
import { Center } from "@repo/ui/center";
import { TextInput } from "@repo/ui/textinput";
import { useState } from "react";
import { p2pTransfer } from "../app/lib/actions/p2pTransfer";

/**
 * SendCard
 *
 * Renders the P2P transfer form (phone number + amount inputs and a Send button).
 * Centred on the page using the shared <Center /> layout component.
 */
export function SendCard() {
    // State for the recipient's phone number (kept as string to preserve leading zeros, etc.)
    const [number, setNumber] = useState("");

    // State for the transfer amount in rupees (kept as string for the input, converted on submit)
    const [amount, setAmount] = useState("");

    return <div className="h-[90vh]">
        {/* Center vertically and horizontally within the 90vh container */}
        <Center>
            <Card title="Send">
                <div className="min-w-72 pt-2">
                    {/* Recipient phone number input */}
                    <TextInput placeholder={"Number"} label="Number" onChange={(value) => {
                        setNumber(value)
                    }} />

                    {/* Transfer amount input (in rupees) */}
                    <TextInput placeholder={"Amount"} label="Amount" onChange={(value) => {
                        setAmount(value)
                    }} />

                    {/* Send button — triggers the p2pTransfer Server Action */}
                    <div className="pt-4 flex justify-center">
                        <Button onClick={async () => {
                            // Convert amount from rupees (string) → paise (number)
                            // before passing to the Server Action (which stores paise)
                            await p2pTransfer(number, Number(amount) * 100)
                        }}>Send</Button>
                    </div>
                </div>
            </Card>
        </Center>
    </div>
}
