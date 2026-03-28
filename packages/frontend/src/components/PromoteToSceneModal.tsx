import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useCreateScene } from '../api/hooks/scenes.js';
import { useArchiveIdea } from '../api/hooks/ideas.js';
import type { Idea } from 'shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActPosition = 1 | 2 | 3 | null;

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
// Props
// ---------------------------------------------------------------------------

export interface PromoteToSceneModalProps {
  /** The WHAT_IF idea being promoted. Must have a non-null projectId. */
  idea: Idea & { projectId: string };
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * "Promote to Scene — from What-If idea" modal.
 *
 * Pre-fills the description from the idea's content.
 * Shows a source banner with the original idea text.
 * Act position selector + optional dialogue snippet.
 * Optional "Archive the original What-If idea after saving" checkbox (unchecked by default).
 *
 * On save: POSTs the scene with `sourceIdeaId` set, then optionally archives the idea.
 */
export function PromoteToSceneModal({
  idea,
  onClose,
}: PromoteToSceneModalProps): React.ReactElement {
  const [description, setDescription] = useState(idea.content);
  const [dialogueSnippet, setDialogueSnippet] = useState('');
  const [position, setPosition] = useState<ActPosition>(null);
  const [archiveOriginal, setArchiveOriginal] = useState(false);

  const descRef = useRef<HTMLTextAreaElement>(null);

  const createScene = useCreateScene(idea.projectId);
  const archiveIdea = useArchiveIdea();

  useEffect(() => {
    requestAnimationFrame(() => descRef.current?.focus());
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isSaving = createScene.isPending || archiveIdea.isPending;
  const canSave = description.trim().length > 0 && !isSaving;

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    try {
      await createScene.mutateAsync({
        description: description.trim(),
        dialogueSnippet: dialogueSnippet.trim() || undefined,
        position: position ?? undefined,
        sourceIdeaId: idea.id,
      });

      if (archiveOriginal) {
        // Fire-and-forget archive — non-critical if it fails
        archiveIdea.mutate(idea.id, {
          onError: () => {
            toast.error('Scene created, but idea could not be archived.');
          },
        });
      }

      toast.success('Scene created from What-If idea.');
      onClose();
    } catch {
      toast.error('Failed to create scene — please try again.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal
      aria-labelledby="promote-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="promote-modal-title" className="text-base font-semibold text-gray-900">
            Promote to Scene — from What-If idea
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

        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-4">

          {/* Source idea banner */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Source What-If idea
            </p>
            <p className="text-sm text-indigo-800 leading-snug">{idea.content}</p>
          </div>

          {/* Description — pre-filled, editable */}
          <div>
            <label
              htmlFor="promote-description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Scene description <span className="text-red-500" aria-hidden>*</span>
            </label>
            <p className="mb-1.5 text-xs text-gray-400">
              Action line only — no internal thought, no prose.
            </p>
            <textarea
              ref={descRef}
              id="promote-description"
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
              htmlFor="promote-dialogue"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Dialogue snippet{' '}
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="promote-dialogue"
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

          {/* Archive original checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={archiveOriginal}
              onChange={(e) => setArchiveOriginal(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
            />
            <span className="text-sm text-gray-700">
              Archive the original What-If idea after saving
            </span>
          </label>

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
              {isSaving ? 'Creating scene…' : 'Promote to Scene'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
