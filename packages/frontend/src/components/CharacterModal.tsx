import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useCreateCharacter,
  usePatchCharacter,
  useDeleteCharacter,
} from '../api/hooks/characters.js';
import type { Character } from 'shared';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type CharacterModalMode =
  | { mode: 'add'; projectId: string; character?: never }
  | { mode: 'edit'; projectId: string; character: Character };

export type CharacterModalProps = CharacterModalMode & {
  /** Called when the modal should close. */
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Add / Edit Character Modal.
 *
 * Add mode: blank form, calls POST on save.
 * Edit mode: pre-filled form, calls PATCH on save.
 *             Shows a "Delete character…" danger link with inline confirmation.
 */
export function CharacterModal(props: CharacterModalProps): React.ReactElement {
  const { mode, projectId, onClose } = props;
  const character = mode === 'edit' ? props.character : undefined;

  const [name, setName] = useState(character?.name ?? '');
  const [obsession, setObsession] = useState(character?.obsession ?? '');
  const [occupation, setOccupation] = useState(character?.occupation ?? '');
  const [notes, setNotes] = useState(character?.notes ?? '');

  /** Inline delete confirmation state. */
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);

  const createCharacter = useCreateCharacter(projectId);
  const patchCharacter = usePatchCharacter(projectId, character?.id ?? '');
  const deleteCharacter = useDeleteCharacter(projectId);

  // Autofocus name field on open.
  useEffect(() => {
    requestAnimationFrame(() => nameRef.current?.focus());
  }, []);

  // Escape closes (unless confirming delete — let user cancel that first).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (confirmingDelete) {
          setConfirmingDelete(false);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, confirmingDelete]);

  const isPending =
    createCharacter.isPending || patchCharacter.isPending || deleteCharacter.isPending;

  const canSave =
    name.trim().length > 0 &&
    obsession.trim().length > 0 &&
    occupation.trim().length > 0 &&
    !isPending;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      obsession: obsession.trim(),
      occupation: occupation.trim(),
      notes: notes.trim() || undefined,
    };

    try {
      if (mode === 'add') {
        await createCharacter.mutateAsync(payload);
        toast.success('Character added.');
      } else {
        await patchCharacter.mutateAsync(payload);
        toast.success('Character updated.');
      }
      onClose();
    } catch {
      toast.error(
        mode === 'add'
          ? 'Failed to add character — please try again.'
          : 'Failed to update character — please try again.'
      );
    }
  }

  async function handleDelete(): Promise<void> {
    if (!character) return;
    try {
      await deleteCharacter.mutateAsync(character.id);
      toast.success('Character deleted.');
      onClose();
    } catch {
      toast.error('Failed to delete character — please try again.');
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmingDelete) onClose();
      }}
      role="dialog"
      aria-modal
      aria-labelledby="character-modal-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="character-modal-title" className="text-base font-semibold text-gray-900">
            {mode === 'add' ? 'Add Character' : 'Edit Character'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-4">

          {/* Name */}
          <div>
            <label htmlFor="char-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              ref={nameRef}
              id="char-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Detective Harrow"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Obsession — craft-critical label per BR-03 */}
          <div>
            <label htmlFor="char-obsession" className="block text-sm font-medium text-gray-700 mb-1">
              Obsession — what drives them <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="char-obsession"
              type="text"
              value={obsession}
              onChange={(e) => setObsession(e.target.value)}
              maxLength={300}
              placeholder="e.g. Proving the system failed his brother"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Occupation */}
          <div>
            <label htmlFor="char-occupation" className="block text-sm font-medium text-gray-700 mb-1">
              Occupation <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              id="char-occupation"
              type="text"
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              maxLength={200}
              placeholder="e.g. Homicide detective, retired"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Notes (optional) */}
          <div>
            <label htmlFor="char-notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="char-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Any additional details…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPending
                ? mode === 'add' ? 'Adding…' : 'Saving…'
                : mode === 'add' ? 'Add character' : 'Save changes'}
            </button>
          </div>
        </form>

        {/* Danger zone — edit mode only */}
        {mode === 'edit' && (
          <div className="border-t border-gray-100 px-6 py-4">
            {!confirmingDelete ? (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="text-sm text-red-600 hover:text-red-800 hover:underline"
              >
                Delete character…
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-700">
                  Delete <strong>{character?.name}</strong>? This cannot be undone.
                </span>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete()}
                    disabled={deleteCharacter.isPending}
                    className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteCharacter.isPending ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
