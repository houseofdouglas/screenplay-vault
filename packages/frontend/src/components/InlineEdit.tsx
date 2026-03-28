import React, { useEffect, useRef, useState } from 'react';

export interface InlineEditProps {
  /** The current saved value. */
  value: string;
  /** Called with the trimmed new value when the user saves. Should throw on API error. */
  onSave: (value: string) => Promise<void>;
  /** Number of textarea rows when editing. Default: 4. */
  rows?: number;
  /** Additional class names applied to the display-mode element. */
  className?: string;
  /** Placeholder shown when value is empty. */
  placeholder?: string;
}

/**
 * Click-to-edit inline text component.
 *
 * - Display mode: renders value as styled text; click (or Enter/Space) activates editing.
 * - Edit mode: textarea with current value; ⌘+Enter (or Ctrl+Enter) saves; Escape cancels.
 * - Saving: calls `onSave`; shows inline error on failure; preserves draft on error.
 */
export function InlineEdit({
  value,
  onSave,
  rows = 4,
  className = '',
  placeholder = '',
}: InlineEditProps): React.ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep draft in sync when external value changes (e.g. after a successful save)
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  function handleActivate() {
    setDraft(value);
    setError(null);
    setEditing(true);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function handleSave(): Promise<void> {
    const trimmed = draft.trim();
    if (trimmed === value.trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch {
      setError('Changes not saved — check your connection.');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(value);
    setEditing(false);
    setError(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  }

  if (!editing) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={handleActivate}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
          }
        }}
        title="Click to edit"
        className={`cursor-text whitespace-pre-wrap rounded-lg border border-transparent p-3 transition-colors hover:border-gray-200 hover:bg-gray-50 ${className}`}
      >
        {value || <span className="text-gray-400 italic">{placeholder}</span>}
      </div>
    );
  }

  return (
    <div>
      <textarea
        ref={textareaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={rows}
        disabled={saving}
        placeholder={placeholder}
        aria-label="Edit idea content"
        className="w-full rounded-lg border border-indigo-500 p-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-60"
      />

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !draft.trim()}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <span className="text-xs text-gray-400">or ⌘+Enter</span>
        <button
          type="button"
          onClick={handleCancel}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
