import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { usePatchProject } from '../api/hooks/projects.js';
import type { ProjectStatus, ProjectWithCounts } from 'shared';
import { PROJECT_STATUSES } from 'shared';

// ---------------------------------------------------------------------------
// Status labels
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DEVELOPING: 'Developing',
  ACTIVE: 'Active',
  SHELVED: 'Shelved',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface EditProjectModalProps {
  /** The project to edit (provides initial field values). */
  project: ProjectWithCounts;
  /** Called when the modal should close. */
  onClose: () => void;
}

/**
 * Modal for editing an existing screenplay project (title, logline, status).
 *
 * On success, closes the modal and invalidates the project cache via the hook.
 */
export function EditProjectModal({
  project,
  onClose,
}: EditProjectModalProps): React.ReactElement {
  const patchProject = usePatchProject(project.id);

  const [title, setTitle] = useState(project.title);
  const [logline, setLogline] = useState(project.logline ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project.status);

  const titleRef = useRef<HTMLInputElement>(null);

  // Autofocus the title input when the modal opens.
  useEffect(() => {
    requestAnimationFrame(() => titleRef.current?.focus());
  }, []);

  // Close on Escape.
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    try {
      await patchProject.mutateAsync({
        title: trimmedTitle,
        logline: logline.trim() || null,
        status,
      });
      onClose();
    } catch {
      toast.error('Failed to update project — please try again.');
    }
  }

  const canSave =
    title.trim().length > 0 &&
    !patchProject.isPending &&
    (title.trim() !== project.title ||
      (logline.trim() || null) !== project.logline ||
      status !== project.status);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal
      aria-labelledby="edit-project-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2
            id="edit-project-title"
            className="text-base font-semibold text-gray-900"
          >
            Edit Project
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
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="px-6 py-5 space-y-5"
        >
          {/* Title */}
          <div>
            <label
              htmlFor="edit-project-title-input"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              ref={titleRef}
              id="edit-project-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Logline */}
          <div>
            <label
              htmlFor="edit-project-logline"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Logline{' '}
              <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="edit-project-logline"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </span>
            <div className="flex gap-2">
              {PROJECT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={[
                    'rounded-full border px-3 py-1 text-sm font-medium transition-colors',
                    status === s
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400',
                  ].join(' ')}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
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
              {patchProject.isPending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
