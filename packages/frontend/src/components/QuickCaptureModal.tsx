import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQuickCaptureStore } from '../store/quick-capture-store.js';
import { useCreateIdea } from '../api/hooks/ideas.js';
import { useProjects } from '../api/hooks/projects.js';
import type { IdeaType } from 'shared';

// ---------------------------------------------------------------------------
// Type pill definitions
// ---------------------------------------------------------------------------

type TypeOption = { label: string; value: IdeaType | null; dashed?: boolean };

const TYPE_OPTIONS: TypeOption[] = [
  { label: 'No type yet', value: null, dashed: true },
  { label: 'What If', value: 'WHAT_IF' },
  { label: 'Character', value: 'CHARACTER' },
  { label: 'Setting', value: 'SETTING' },
  { label: 'First Line', value: 'FIRST_LINE' },
  { label: 'Scene', value: 'SCENE' },
  { label: 'Theme', value: 'THEME' },
  { label: 'News Flash', value: 'NEWS_FLASH' },
];

// ---------------------------------------------------------------------------
// Tag input helpers
// ---------------------------------------------------------------------------

/** Split a raw tag string on commas, trim, and dedupe. */
function splitTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    ),
  ];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Quick Capture Modal.
 *
 * Opened by the FAB, the `N` keyboard shortcut, or any component that calls
 * `useQuickCaptureStore.getState().open(opts)`.
 */
export function QuickCaptureModal(): React.ReactElement | null {
  const { isOpen, prefilledContent, prefilledProjectId, lockProject, close } =
    useQuickCaptureStore();

  const createIdea = useCreateIdea();
  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];

  // Local form state
  const [selectedType, setSelectedType] = useState<IdeaType | null>(null);
  const [content, setContent] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [tagsRaw, setTagsRaw] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync prefilled values when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedType(null);
      setContent(prefilledContent);
      setProjectId(prefilledProjectId ?? '');
      setTagsRaw('');
      // Autofocus textarea after the render
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  }, [isOpen, prefilledContent, prefilledProjectId]);

  // Reset mutation state when the modal closes
  const createIdeaReset = createIdea.reset;
  useEffect(() => {
    if (!isOpen) {
      createIdeaReset();
    }
  }, [isOpen, createIdeaReset]);

  const handleClose = useCallback(() => {
    if (!createIdea.isPending) {
      close();
    }
  }, [close, createIdea.isPending]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!content.trim()) return;

      const tags = splitTags(tagsRaw);

      try {
        const result = await createIdea.mutateAsync({
          type: selectedType ?? undefined,
          content: content.trim(),
          projectId: projectId || undefined,
          tags,
        });

        close();

        toast.success(
          (t) => (
            <span>
              Idea saved!{' '}
              <Link
                to={`/ideas/${result.data.id}`}
                className="underline font-medium"
                onClick={() => toast.dismiss(t.id)}
              >
                View
              </Link>
            </span>
          ),
          { duration: 5000 }
        );
      } catch {
        toast.error('Failed to save idea — please try again.');
        // Modal stays open, content preserved
      }
    },
    [content, tagsRaw, selectedType, projectId, createIdea, close]
  );

  if (!isOpen) return null;

  const canSubmit = content.trim().length > 0 && !createIdea.isPending;
  const hasProjects = projects.length > 0;

  return (
    /* Backdrop
     * Mobile:  drawer from the bottom — sits above keyboard thanks to dvh units.
     * Desktop: centred card with padding, classic modal style.
     */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture idea"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 md:p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
    >
      {/* Modal panel
       * Mobile:  full-width bottom sheet; max 90dvh so iOS keyboard shrinks it gracefully.
       * Desktop: centred card, max-w-lg, fixed rounding all round.
       */}
      <div className="relative w-full md:max-w-lg rounded-t-2xl md:rounded-xl bg-white shadow-2xl flex flex-col max-h-[90dvh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-gray-900">Capture an idea</h2>
          <button
            type="button"
            aria-label="Close modal"
            onClick={handleClose}
            disabled={createIdea.isPending}
            className="rounded-md p-1 text-gray-400 hover:text-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4 px-5 pb-5">
          {/* Type pill row */}
          <div>
            <span className="sr-only">Idea type</span>
            <div className="flex flex-wrap gap-1.5">
              {TYPE_OPTIONS.map((opt) => {
                const active = selectedType === opt.value;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => setSelectedType(opt.value)}
                    className={[
                      'rounded-full px-3 py-1 text-xs font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500',
                      active
                        ? 'bg-indigo-600 text-white border border-indigo-600'
                        : opt.dashed
                          ? 'border border-dashed border-gray-400 text-gray-500 hover:border-gray-600 hover:text-gray-700'
                          : 'border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800',
                    ].join(' ')}
                    aria-pressed={active}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content textarea */}
          <div>
            <label htmlFor="qc-content" className="sr-only">
              Idea content
            </label>
            <textarea
              id="qc-content"
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's the idea?"
              rows={5}
              required
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Project selector — hidden if user has no projects */}
          {hasProjects && (
            <div>
              <label htmlFor="qc-project" className="block text-xs font-medium text-gray-600 mb-1">
                Project{' '}
                <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <select
                id="qc-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={lockProject}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags input */}
          <div>
            <label htmlFor="qc-tags" className="block text-xs font-medium text-gray-600 mb-1">
              Tags{' '}
              <span className="font-normal text-gray-400">(optional — comma-separated)</span>
            </label>
            <input
              id="qc-tags"
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="e.g. heist, thriller, ensemble"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={createIdea.isPending}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createIdea.isPending ? 'Saving…' : 'Save idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
