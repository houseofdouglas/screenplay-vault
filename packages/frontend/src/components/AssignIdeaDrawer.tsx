import React, { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useIdeas, useBulkAssignIdeas } from '../api/hooks/ideas.js';
import { useProjects } from '../api/hooks/projects.js';
import { IDEA_TYPE_LABELS } from './IdeaCard.js';
import type { Idea } from 'shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AssignIdeaDrawerProps {
  /** The project to assign ideas to. */
  projectId: string;
  /** Called when the drawer should close. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function matchesSearch(idea: Idea, q: string): boolean {
  if (!q) return true;
  const lower = q.toLowerCase();
  return (
    idea.content.toLowerCase().includes(lower) ||
    idea.tags.some((t) => t.toLowerCase().includes(lower))
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Right-side drawer for assigning existing ideas to a project.
 *
 * Lists all non-archived ideas NOT already assigned to this project,
 * grouped as unassigned first then other-project ideas (labelled).
 * Supports keyword search and multi-select checkboxes.
 * "Assign N idea(s)" CTA PATCHes each selected idea's projectId.
 */
export function AssignIdeaDrawer({
  projectId,
  onClose,
}: AssignIdeaDrawerProps): React.ReactElement {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: ideasData, isLoading } = useIdeas({ archived: 'false' });
  const { data: projectsData } = useProjects();
  const assign = useBulkAssignIdeas(projectId);

  // Project name lookup
  const projectNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const p of projectsData?.data ?? []) {
      map[p.id] = p.title;
    }
    return map;
  }, [projectsData?.data]);

  // All ideas not belonging to this project
  const eligibleIdeas = useMemo(
    () => (ideasData?.data ?? []).filter((i) => i.projectId !== projectId),
    [ideasData?.data, projectId]
  );

  // Apply search filter
  const filtered = useMemo(
    () => eligibleIdeas.filter((i) => matchesSearch(i, search.trim())),
    [eligibleIdeas, search]
  );

  // Split into groups: unassigned first, then other-project
  const unassigned = useMemo(() => filtered.filter((i) => i.projectId === null), [filtered]);
  const otherProject = useMemo(() => filtered.filter((i) => i.projectId !== null), [filtered]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAssign(): Promise<void> {
    if (selected.size === 0) return;
    try {
      await assign.mutateAsync([...selected]);
      toast.success(
        `${selected.size} ${selected.size === 1 ? 'idea' : 'ideas'} assigned.`
      );
      onClose();
    } catch {
      toast.error('Assignment failed — please try again.');
    }
  }

  const selectedCount = selected.size;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
        aria-hidden
      />

      {/* Drawer panel */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl"
        role="dialog"
        aria-modal
        aria-label="Assign existing idea"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            Assign existing idea
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M4.28 3.22a.75.75 0 0 0-1.06 1.06L6.94 8l-3.72 3.72a.75.75 0 1 0 1.06 1.06L8 9.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L9.06 8l3.72-3.72a.75.75 0 0 0-1.06-1.06L8 6.94 4.28 3.22Z" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-gray-100 px-5 py-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search ideas…"
            aria-label="Search ideas to assign"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Idea list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="space-y-2 p-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center px-5">
              <p className="text-sm text-gray-500">
                {search ? `No ideas match "${search}"` : 'All ideas are already assigned to this project.'}
              </p>
            </div>
          )}

          {!isLoading && unassigned.length > 0 && (
            <IdeaGroup
              label="Unassigned"
              ideas={unassigned}
              selected={selected}
              onToggle={toggleSelect}
            />
          )}

          {!isLoading && otherProject.length > 0 && (
            <IdeaGroup
              label="From other projects"
              ideas={otherProject}
              selected={selected}
              onToggle={toggleSelect}
              projectNames={projectNames}
            />
          )}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-gray-200 px-5 py-4 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleAssign()}
            disabled={selectedCount === 0 || assign.isPending}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {assign.isPending
              ? 'Assigning…'
              : selectedCount === 0
                ? 'Assign idea'
                : `Assign ${selectedCount} ${selectedCount === 1 ? 'idea' : 'ideas'}`}
          </button>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface IdeaGroupProps {
  label: string;
  ideas: Idea[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  projectNames?: Record<string, string>;
}

function IdeaGroup({
  label,
  ideas,
  selected,
  onToggle,
  projectNames,
}: IdeaGroupProps): React.ReactElement {
  return (
    <div>
      <p className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border-b border-gray-100">
        {label}
      </p>
      <ul>
        {ideas.map((idea) => {
          const isChecked = selected.has(idea.id);
          const fromProject =
            idea.projectId && projectNames ? projectNames[idea.projectId] : null;
          return (
            <li key={idea.id}>
              <label className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => onToggle(idea.id)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  {/* Type badge */}
                  {idea.type && (
                    <span className="mr-1.5 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {IDEA_TYPE_LABELS[idea.type]}
                    </span>
                  )}
                  {/* Content */}
                  <p className="text-sm text-gray-900 leading-snug line-clamp-2 mt-0.5">
                    {idea.content}
                  </p>
                  {/* Project label (for other-project group) */}
                  {fromProject && (
                    <p className="mt-0.5 text-xs text-gray-400">{fromProject}</p>
                  )}
                </div>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
