import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { usePatchIdea } from '../api/hooks/ideas.js';
import { useProjects } from '../api/hooks/projects.js';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface QuickAssignModalProps {
  /** The idea to assign. */
  ideaId: string;
  /** The idea's current projectId (to pre-select the dropdown). */
  currentProjectId: string | null;
  onClose: () => void;
}

/**
 * Lightweight modal to assign (or reassign) an idea to a project from the
 * Ideas List overflow menu. Shows a dropdown of the user's projects with an
 * "Unassigned" option at the top.
 */
export function QuickAssignModal({
  ideaId,
  currentProjectId,
  onClose,
}: QuickAssignModalProps): React.ReactElement {
  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];
  const patchIdea = usePatchIdea(ideaId);

  const [selectedId, setSelectedId] = useState<string>(currentProjectId ?? '');

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSave(): Promise<void> {
    const newProjectId = selectedId || null;
    // No-op if unchanged
    if (newProjectId === currentProjectId) {
      onClose();
      return;
    }
    try {
      await patchIdea.mutateAsync({ projectId: newProjectId });
      onClose();
      toast.success(
        newProjectId ? 'Idea assigned to project.' : 'Idea unassigned from project.',
      );
    } catch {
      toast.error('Failed to update assignment — please try again.');
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal
      aria-label="Assign idea to project"
    >
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Assign to project</h2>
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

        <div className="px-5 py-5 space-y-4">
          <div>
            <label htmlFor="qa-project" className="block text-xs font-medium text-gray-600 mb-1.5">
              Project
            </label>
            <select
              id="qa-project"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— Unassigned —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={patchIdea.isPending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {patchIdea.isPending ? 'Saving…' : 'Assign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
