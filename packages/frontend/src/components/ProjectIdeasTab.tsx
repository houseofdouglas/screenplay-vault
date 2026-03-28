import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIdeas } from '../api/hooks/ideas.js';
import { useProjects } from '../api/hooks/projects.js';
import { useQuickCaptureStore } from '../store/quick-capture-store.js';
import { IdeaCard } from './IdeaCard.js';
import { AssignIdeaDrawer } from './AssignIdeaDrawer.js';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProjectIdeasTabProps {
  /** The project whose ideas are shown. */
  projectId: string;
}

/**
 * Ideas tab within the Project Dashboard.
 *
 * Shows idea cards for this project with a search toolbar,
 * "Assign existing idea" drawer, and "+ Capture new idea" Quick Capture shortcut.
 */
export function ProjectIdeasTab({
  projectId,
}: ProjectIdeasTabProps): React.ReactElement {
  const location = useLocation();
  const openQuickCapture = useQuickCaptureStore((s) => s.open);

  const [search, setSearch] = useState('');
  const [showDrawer, setShowDrawer] = useState(false);

  // Fetch ideas assigned to this project
  const { data, isLoading, isError } = useIdeas({
    projectId,
    archived: 'false',
    ...(search.trim() ? { q: search.trim() } : {}),
  });

  // Project name for IdeaCard display (we pass undefined since we're already
  // scoped to a project — no need to show the project name on each card)
  const { data: projectsData } = useProjects();
  const projectMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projectsData?.data ?? []) m[p.id] = p.title;
    return m;
  }, [projectsData?.data]);

  const ideas = data?.data ?? [];
  const isEmpty = !isLoading && !isError && ideas.length === 0;

  function handleCaptureNew() {
    openQuickCapture({ projectId, lockProject: true });
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="flex-1 min-w-48">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search this project's ideas…"
            aria-label="Search ideas"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Assign existing */}
        <button
          type="button"
          onClick={() => setShowDrawer(true)}
          className="rounded-lg border border-gray-300 px-3.5 py-2 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors shrink-0"
        >
          Assign existing idea
        </button>

        {/* Capture new */}
        <button
          type="button"
          onClick={handleCaptureNew}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shrink-0"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 3.5a.75.75 0 0 1 .75.75v3h3a.75.75 0 0 1 0 1.5h-3v3a.75.75 0 0 1-1.5 0v-3h-3a.75.75 0 0 1 0-1.5h3v-3A.75.75 0 0 1 8 3.5Z" />
          </svg>
          Capture new idea
        </button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-2" aria-label="Loading ideas">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load ideas. Please refresh.
        </div>
      )}

      {/* Empty state — no ideas in project */}
      {isEmpty && !search && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-3xl">💡</div>
          <h3 className="text-base font-semibold text-gray-900">No ideas yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Capture a new idea or assign an existing one.
          </p>
          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleCaptureNew}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              + Capture new idea
            </button>
            <button
              type="button"
              onClick={() => setShowDrawer(true)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Assign existing idea
            </button>
          </div>
        </div>
      )}

      {/* Empty state — no search results */}
      {isEmpty && search && (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-500">
            No ideas in this project match &ldquo;{search}&rdquo;.
          </p>
        </div>
      )}

      {/* Idea cards */}
      {!isLoading && !isError && ideas.length > 0 && (
        <ul className="space-y-2" aria-label="Project ideas">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <IdeaCard
                idea={idea}
                projectName={
                  idea.projectId ? projectMap[idea.projectId] : undefined
                }
                listContext={location.search}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Assign drawer */}
      {showDrawer && (
        <AssignIdeaDrawer
          projectId={projectId}
          onClose={() => setShowDrawer(false)}
        />
      )}
    </div>
  );
}
