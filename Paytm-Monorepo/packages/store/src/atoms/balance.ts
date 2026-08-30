/**
 * packages/store/src/atoms/balance.ts  (Recoil Balance Atom)
 *
 * Defines the global Recoil atom that holds the user's wallet balance
 * in the client-side state tree.
 *
 * ─── What is a Recoil Atom? ─────────────────────────────────────────────────
 * An atom is a unit of state in Recoil — similar to a single `useState` value
 * but shareable across any number of components in the tree without prop drilling.
 * Any component that reads this atom will automatically re-render when its value
 * changes. Any component can write to it using `useSetRecoilState` or
 * `useRecoilState`.
 *
 * ─── This Atom ──────────────────────────────────────────────────────────────
 * `balanceAtom` stores the user's current wallet balance as a number (in paise).
 * It starts at 0 and should be populated by fetching balance data from the server
 * (e.g. via the `useBalance` hook or a data-fetching effect).
 *
 * key:     "balance"  — must be globally unique across all Recoil atoms in the app
 * default: 0          — initial value before any data is loaded (in paise)
 *
 * Consumed by:
 *  - useBalance hook (packages/store/src/hooks/useBalance.ts)
 */
import { atom } from "recoil";

/**
 * balanceAtom
 *
 * Global Recoil atom storing the user's wallet balance in paise.
 * Default value is 0 (no balance loaded yet).
 */
export const balanceAtom = atom<number>({
    key: "balance",  // unique Recoil atom key — must be unique across the entire app
    default: 0,      // initial state in paise (0 = no balance data loaded yet)
})
