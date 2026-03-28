import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCreateProject } from '../api/hooks/projects.js';
import type { ProjectStatus } from 'shared';
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

export interface CreateProjectModalProps {
  /** Called when the modal should close (Escape, backdrop, or cancel). */
  onClose: () => void;
}

/**
 * Modal for creating a new screenplay project.
 *
 * On success, navigates immediately to the new project's dashboard.
 */
export function CreateProjectModal({ onClose }: CreateProjectModalProps): React.ReactElement {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const [title, setTitle] = useState('');
  const [logline, setLogline] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('DEVELOPING');

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
      const result = await createProject.mutateAsync({
        title: trimmedTitle,
        logline: logline.trim() || undefined,
        status,
      });
      void navigate(`/projects/${result.data.id}`);
    } catch {
      toast.error('Failed to create project — please try again.');
    }
  }

  const canSave = title.trim().length > 0 && !createProject.isPending;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal
      aria-labelledby="create-project-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 id="create-project-title" className="text-base font-semibold text-gray-900">
            New Project
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
        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 py-5 space-y-5">

          {/* Title */}
          <div>
            <label htmlFor="project-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500" aria-hidden>*</span>
            </label>
            <input
              ref={titleRef}
              id="project-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="e.g. The Last Detective"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Logline */}
          <div>
            <label htmlFor="project-logline" className="block text-sm font-medium text-gray-700 mb-1">
              Logline <span className="text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              id="project-logline"
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="A one-sentence description of the story…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <span className="block text-sm font-medium text-gray-700 mb-2">Status</span>
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
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
