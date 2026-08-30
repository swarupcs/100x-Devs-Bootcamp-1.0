/**
 * packages/ui/src/TextInput.tsx  (Shared Text Input Component)
 *
 * A reusable, controlled text input field from the @repo/ui package.
 * Used in forms across the user-app:
 *  - AddMoneyCard: "Amount" field
 *  - SendCard: "Number" (phone) and "Amount" fields
 *
 * "use client" is required because this component attaches an onChange event
 * handler — a browser event that cannot be used in Server Components.
 *
 * Design pattern — Uncontrolled value, controlled via callback:
 *  The component does NOT manage its own state (no `useState`).
 *  It calls `onChange` with the current input value on every keystroke.
 *  The parent component owns the state and stores the value.
 *  This makes TextInput a "controlled input" from the parent's perspective.
 *
 * Props:
 *  placeholder — Ghost text shown inside the input when it is empty
 *  onChange    — Callback fired with the raw string value on each input event
 *  label       — Accessible label text rendered above the input field
 *
 * Styling:
 *  Consistent with the Select component — light grey background, border, rounded,
 *  blue focus ring. This visual consistency is important for form UX.
 */
"use client"

/**
 * TextInput
 *
 * A styled, labelled text input that reports changes to the parent via `onChange`.
 *
 * @param placeholder - Placeholder text inside the input
 * @param onChange    - Called with the current string value on every keystroke
 * @param label       - Label text displayed above the input
 */
export const TextInput = ({
    placeholder,
    onChange,
    label
}: {
    placeholder: string;                  // hint text shown when the field is empty
    onChange: (value: string) => void;    // parent callback — receives e.target.value
    label: string;                        // accessible label displayed above the input
}) => {
    return <div className="pt-2">
        {/* Visible label — associated with the input below for accessibility */}
        <label className="block mb-2 text-sm font-medium text-gray-900">{label}</label>

        {/* Text input field */}
        <input
            // Extract the string value from the synthetic event and pass to parent
            onChange={(e) => onChange(e.target.value)}
            type="text"
            id="first_name"  // TODO: use a unique id derived from the label prop for proper <label for> association
            // Tailwind classes matching the Select component's visual style
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
            placeholder={placeholder}
        />
    </div>
}
