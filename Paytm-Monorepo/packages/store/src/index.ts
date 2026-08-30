/**
 * packages/store/src/index.ts  (Store Package Entry Point)
 *
 * The main entry point for the @repo/store shared package.
 * Currently empty (exports nothing from the top level).
 *
 * Individual exports are provided via sub-path exports defined in package.json:
 *  - "@repo/store/useBalance" → src/hooks/useBalance.ts
 *  - "@repo/store/atoms"     → src/atoms/balance.ts  (if configured)
 *
 * This pattern (empty index + sub-path exports) keeps the package modular:
 * consumers import exactly what they need rather than the entire store bundle.
 *
 * If you want to add top-level exports in the future, you can add them here:
 *  export { balanceAtom } from "./atoms/balance"
 *  export { useBalance }  from "./hooks/useBalance"
 */
export {};
