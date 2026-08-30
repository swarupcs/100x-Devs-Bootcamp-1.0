/**
 * packages/ui/src/Select.tsx  (Shared Dropdown Select Component)
 *
 * A reusable, controlled <select> dropdown component from the @repo/ui package.
 * Used in AddMoneyCard to let the user choose a bank for OnRamp transactions.
 *
 * "use client" is required because this component attaches an onChange event
 * handler — a browser event that cannot run during server-side rendering.
 *
 * Design pattern — Controlled via callback (not internal state):
 *  The component does NOT hold internal state. Instead, it calls `onSelect`
 *  with the selected value every time the user changes the selection.
 *  The parent component owns the state and decides what to do with the value.
 *  This keeps the component simple and reusable.
 *
 * Props:
 *  options  — Array of { key, value } pairs:
 *               key:   used as the HTML option's `value` attribute (what gets submitted)
 *               value: the human-readable label displayed to the user in the dropdown
 *  onSelect — Callback fired with the selected `key` when the user changes selection
 *
 * Styling:
 *  Light grey background, rounded, with a blue focus ring — matches Flowbite/Tailwind patterns.
 */
"use client"

/**
 * Select
 *
 * A styled native HTML <select> dropdown that calls `onSelect` on change.
 *
 * @param options  - Array of { key, value } options to render in the dropdown
 * @param onSelect - Called with the selected option's key when the user picks an item
 */
export const Select = ({ options, onSelect }: {
    onSelect: (value: string) => void;  // receives the `key` of the selected option
    options: {
        key: string;    // unique identifier / value submitted for this option
        value: string;  // human-readable label shown in the dropdown
    }[];
}) => {
    return <select
        // Call onSelect with the selected option's value when the user changes their choice
        onChange={(e) => {
            onSelect(e.target.value)
        }}
        // Tailwind classes for a styled, accessible dropdown input
        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
    >
        {/* Render each option. The `key` prop is used as the HTML value attribute. */}
        {options.map(option => <option key={option.key} value={option.key}>{option.value}</option>)}
  </select>
}
