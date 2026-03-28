import React from 'react';

const LABELS: Record<1 | 2 | 3, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
};

export interface ExcitementWidgetProps {
  /** Current excitement rating (1–3) or null if unrated. */
  value: 1 | 2 | 3 | null;
  /** Called with the new rating, or null when the user clicks the active dot to clear it. */
  onChange: (value: 1 | 2 | 3 | null) => void;
  disabled?: boolean;
}

/**
 * Three clickable dots representing excitement level 1–3.
 * Clicking the currently selected dot clears the rating to null.
 */
export function ExcitementWidget({
  value,
  onChange,
  disabled = false,
}: ExcitementWidgetProps): React.ReactElement {
  const levels = [1, 2, 3] as const;

  return (
    <div className="flex items-center gap-2">
      {levels.map((level) => {
        const filled = value !== null && level <= value;
        const isActive = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-label={`${LABELS[level]} excitement${isActive ? ' — click to clear' : ''}`}
            aria-pressed={isActive}
            disabled={disabled}
            onClick={() => onChange(isActive ? null : level)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-full disabled:cursor-not-allowed"
          >
            <span
              className={[
                'block h-4 w-4 rounded-full transition-colors',
                filled
                  ? 'bg-indigo-500 hover:bg-indigo-400'
                  : 'border-2 border-gray-300 hover:border-indigo-400',
              ].join(' ')}
            />
          </button>
        );
      })}
      {value !== null && (
        <span className="text-xs text-gray-500 ml-1">{LABELS[value]}</span>
      )}
    </div>
  );
}
