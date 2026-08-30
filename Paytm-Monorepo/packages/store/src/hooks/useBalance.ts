/**
 * packages/store/src/hooks/useBalance.ts  (Custom Recoil Hook)
 *
 * A custom React hook that provides a clean API for reading the user's
 * wallet balance from the global Recoil state.
 *
 * ─── Why a custom hook? ─────────────────────────────────────────────────────
 * Instead of every component importing both `useRecoilValue` AND `balanceAtom`,
 * this hook abstracts that away behind a single, intent-revealing import:
 *   `import { useBalance } from "@repo/store/useBalance"`
 *
 * Benefits:
 *  - Cleaner component code (no Recoil import boilerplate at call sites)
 *  - Single place to change if we ever swap Recoil for another state manager
 *  - Easy to extend (e.g. add loading/error state, automatic fetching logic)
 *
 * Usage:
 *  const balance = useBalance();  // returns the balance in paise (number)
 *
 * The hook must be used inside a component that is wrapped by <RecoilRoot>
 * (which is provided by the <Providers> component in each app's layout).
 *
 * @returns number — the current wallet balance in paise from the global Recoil atom
 */
import { useRecoilValue } from "recoil"
import { balanceAtom } from "../atoms/balance"

/**
 * useBalance
 *
 * Custom hook that reads and returns the current wallet balance
 * from the global Recoil `balanceAtom`.
 *
 * @returns number — wallet balance in paise (divide by 100 for rupees display)
 */
export const useBalance = () => {
    // `useRecoilValue` subscribes this component to the balanceAtom.
    // The component will automatically re-render when the atom's value changes.
    const value = useRecoilValue(balanceAtom);
    return value;
}
