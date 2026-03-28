import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import {
  useCreateScene,
  usePatchScene,
  useDeleteScene,
} from '../api/hooks/scenes.js';
import type { Scene } from 'shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActPosition = 1 | 2 | 3 | null;

type SceneModalMode =
  | { mode: 'add'; projectId: string; scene?: never }
  | { mode: 'edit'; projectId: string; scene: Scene };

export type SceneModalProps = SceneModalMode & {
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Act position pill options
// ---------------------------------------------------------------------------

interface ActOption {
  label: string;
  value: ActPosition;
}

const ACT_OPTIONS: ActOption[] = [
  { label: 'Not placed yet', value: null },
  { label: 'Act 1', value: 1 },
  { label: 'Act 2', value: 2 },
  { label: 'Act 3', value: 3 },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Add / Edit Scene Modal.
 *
 * Add mode: blank form, POST on save.
 * Edit mode: pre-filled form, PATCH on save.
 *             Shows "Delete this scene…" danger link with inline confirmation.
 */
export function SceneModal(props: SceneModalProps): React.ReactElement {
  const { mode, projectId, onClose } = props;
  const scene = mode === 'edit' ? props.scene : undefined;

  const [description, setDescription] = useState(scene?.description ?? '');
  const [dialogueSnippet, setDialogueSnippet] = useState(
    scene?.dialogueSnippet ?? ''
  );
  const [position, setPosition] = useState<ActPosition>(
    scene?.position ?? null
  );
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const descRef = useRef<HTMLTextAreaElement>(null);

  const createScene = useCreateScene(projectId);
  const patchScene = usePatchScene(projectId, scene?.id ?? '');
  const deleteScene = useDeleteScene(projectId);

  useEffect(() => {
    requestAnimationFrame(() => descRef.current?.focus());
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (confirmingDelete) setConfirmingDelete(false);
        else onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, confirmingDelete]);

  const isPending =
    createScene.isPending || patchScene.isPending || deleteScene.isPending;

  const canSave = description.trim().length > 0 && !isPending;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      if (mode === 'add') {
        await createScene.mutateAsync({
          description: description.trim(),
          dialogueSnippet: dialogueSnippet.trim() || undefined,
          position: position ?? undefined,
        });
        toast.success('Scene added.');
      } else {
        await patchScene.mutateAsync({
          description: description.trim(),
          dialogueSnippet: dialogueSnippet.trim() || null,
          position,
        });
        toast.success('Scene updated.');
      }
      onClose();
    } catch {
      toast.error(
        mode === 'add'
          ? 'Failed to add scene — please try again.'
          : 'Failed to update scene — please try again.'
      );
    }
  }

  async function handleDelete(): Promise<void> {
    if (!scene) return;
    try {
      await deleteScene.mutateAsync(scene.id);
      toast.success('Scene deleted.');
      onClose();
    } catch {
      toast.error('Failed to delete scene — please try again.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmingDelete) onClose();
      }}
      role="dialog"
      aria-modal
      aria-labelledby="scene-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="scene-modal-title" className="text-base font-semibold text-gray-900">
            {mode === 'add' ? 'Add Scene' : 'Edit Scene'}
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

          {/* Description */}
          <div>
            <label
              htmlFor="scene-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description <span className="text-red-500" aria-hidden>*</span>
            </label>
            <p className="mb-1.5 text-xs text-gray-400">
              Action line only — no internal thought, no prose.
            </p>
            <textarea
              ref={descRef}
              id="scene-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={4}
              required
              placeholder="INT. / EXT. LOCATION — TIME. Action. What happens."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Dialogue snippet (optional) */}
          <div>
            <label
              htmlFor="scene-dialogue"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Dialogue snippet{' '}
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="scene-dialogue"
              value={dialogueSnippet}
              onChange={(e) => setDialogueSnippet(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Key line or exchange from this scene…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Act position — 4-way pill */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Act position</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Act position">
              {ACT_OPTIONS.map(({ label, value }) => {
                const isSelected = position === value;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPosition(value)}
                    aria-pressed={isSelected}
                    className={[
                      'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors border',
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600',
                    ].join(' ')}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
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
                : mode === 'add' ? 'Add scene' : 'Save changes'}
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
                Delete this scene…
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-700">
                  Delete this scene? This cannot be undone.
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
                    disabled={deleteScene.isPending}
                    className="rounded-lg bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {deleteScene.isPending ? 'Deleting…' : 'Delete'}
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
