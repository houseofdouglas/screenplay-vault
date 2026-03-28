import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useIdeas } from '../api/hooks/ideas.js';
import { useProjects } from '../api/hooks/projects.js';
import { useIdeasFilters, SORT_LABELS } from '../hooks/useIdeasFilters.js';
import { useQuickCaptureStore } from '../store/quick-capture-store.js';
import { IdeaCard, IDEA_TYPE_LABELS } from '../components/IdeaCard.js';
import { QuickAssignModal } from '../components/QuickAssignModal.js';
import type { IdeaType } from 'shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORDERED_TYPES: IdeaType[] = [
  'WHAT_IF', 'CHARACTER', 'SETTING', 'FIRST_LINE', 'SCENE', 'THEME', 'NEWS_FLASH',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Removable chip for an active filter. */
function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}): React.ReactElement {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="rounded-full hover:bg-indigo-100 p-0.5 transition-colors"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
          <path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06L4.94 6 2.22 8.72a.75.75 0 1 0 1.06 1.06L6 7.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L7.06 6l2.72-2.72a.75.75 0 0 0-1.06-1.06L6 4.94 3.28 2.22Z" />
        </svg>
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

/**
 * Ideas List page at `/ideas`.
 *
 * Displays all (non-)archived ideas with:
 * - Type and project filter sidebar (counts from API meta)
 * - Search with 300ms debounce
 * - Sort selector
 * - Active filter chips with ✕ removal and "Clear all"
 * - Result count display
 * - Empty state with Quick Capture CTA
 * - All filter state reflected in URL params (bookmarkable)
 */
export function IdeasListPage(): React.ReactElement {
  const location = useLocation();

  const {
    filters,
    search,
    setSearch,
    setType,
    setProjectId,
    setSort,
    setArchived,
    setStale,
    clearFilters,
    activeCount,
  } = useIdeasFilters();

  const openModal = useQuickCaptureStore((s) => s.open);

  // State for the "Assign to project…" quick-assign modal
  const [assignTarget, setAssignTarget] = useState<{ id: string; projectId: string | null } | null>(null);

  // Map frontend filter state → API params
  const apiParams = useMemo(
    () => ({
      type: filters.type && filters.type !== 'untyped' ? filters.type : undefined,
      projectId: filters.projectId,
      q: filters.q,
      sort: filters.sort,
      archived: filters.archived ? ('true' as const) : ('false' as const),
      stale: filters.stale ? ('true' as const) : undefined,
    }),
    [filters]
  );

  const { data, isLoading, isError } = useIdeas(apiParams);
  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];
  const meta = data?.meta;

  // Client-side "untyped" filter (null type not an API enum value)
  const ideas = useMemo(() => {
    if (!data?.data) return [];
    if (filters.type === 'untyped') return data.data.filter((i) => i.type === null);
    return data.data;
  }, [data?.data, filters.type]);

  // Result count label
  const resultLabel = useMemo(() => {
    const n = ideas.length;
    const total = meta?.total ?? 0;
    const plural = n !== 1 ? 's' : '';
    if (!filters.type && !filters.q) return `${n} idea${plural}`;
    if (filters.type && !filters.q)
      return `${n} of ${total} ${IDEA_TYPE_LABELS[filters.type]} idea${plural}`;
    if (filters.q) {
      const typePrefix = filters.type ? `${IDEA_TYPE_LABELS[filters.type]} ` : '';
      return `${n} of ${total} ${typePrefix}idea${plural} match "${filters.q}"`;
    }
    return `${n} idea${plural}`;
  }, [ideas.length, meta?.total, filters.type, filters.q]);

  // Build filter chips
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  if (filters.type)
    chips.push({
      key: 'type',
      label: IDEA_TYPE_LABELS[filters.type],
      onRemove: () => setType(undefined),
    });
  if (filters.projectId) {
    const project = projects.find((p) => p.id === filters.projectId);
    chips.push({
      key: 'projectId',
      label: filters.projectId === 'unassigned' ? 'Unassigned' : (project?.title ?? filters.projectId),
      onRemove: () => setProjectId(undefined),
    });
  }
  if (filters.sort !== 'recent')
    chips.push({
      key: 'sort',
      label: `Sort: ${SORT_LABELS[filters.sort]}`,
      onRemove: () => setSort('recent'),
    });
  if (filters.archived)
    chips.push({ key: 'archived', label: 'Archived', onRemove: () => setArchived(false) });
  if (filters.stale)
    chips.push({ key: 'stale', label: 'Stale ideas', onRemove: () => setStale(false) });

  return (
    <>
    <div className="flex min-h-full">
      {/* ── Filter sidebar ───────────────────────────────────────────── */}
      <aside className="w-48 shrink-0 border-r border-gray-200 bg-white px-3 py-4 space-y-6">
        {/* Type filters */}
        {meta && (
          <section>
            <h3 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Type
            </h3>
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => setType(undefined)}
                  className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                    !filters.type
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>All types</span>
                </button>
              </li>
              {ORDERED_TYPES.map((t) => {
                const count = meta.typeCounts[t] ?? 0;
                if (count === 0 && filters.type !== t) return null;
                return (
                  <li key={t}>
                    <button
                      type="button"
                      onClick={() => setType(filters.type === t ? undefined : t)}
                      className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                        filters.type === t
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{IDEA_TYPE_LABELS[t]}</span>
                      <span className="text-xs text-gray-400">{count}</span>
                    </button>
                  </li>
                );
              })}
              {(meta.typeCounts['UNTYPED'] ?? 0) > 0 && (
                <li>
                  <button
                    type="button"
                    onClick={() => setType(filters.type === 'untyped' ? undefined : 'untyped')}
                    className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                      filters.type === 'untyped'
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>Raw / Untyped</span>
                    <span className="text-xs text-gray-400">{meta.typeCounts['UNTYPED']}</span>
                  </button>
                </li>
              )}
            </ul>
          </section>
        )}

        {/* Project filters */}
        {meta && Object.keys(meta.projectCounts).length > 0 && (
          <section>
            <h3 className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Project
            </h3>
            <ul className="space-y-0.5">
              <li>
                <button
                  type="button"
                  onClick={() => setProjectId(undefined)}
                  className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                    !filters.projectId
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>All projects</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    setProjectId(filters.projectId === 'unassigned' ? undefined : 'unassigned')
                  }
                  className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                    filters.projectId === 'unassigned'
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span>Unassigned</span>
                  <span className="text-xs text-gray-400">
                    {meta.projectCounts['unassigned'] ?? 0}
                  </span>
                </button>
              </li>
              {projects.map((p) => {
                const count = meta.projectCounts[p.id] ?? 0;
                if (count === 0 && filters.projectId !== p.id) return null;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setProjectId(filters.projectId === p.id ? undefined : p.id)
                      }
                      title={p.title}
                      className={`w-full flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors ${
                        filters.projectId === p.id
                          ? 'bg-indigo-50 text-indigo-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{p.title}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-1">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </aside>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 px-6 py-4">
        {/* Search + sort row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ideas…"
              aria-label="Search ideas"
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filters.sort}
            onChange={(e) => setSort(e.target.value as typeof filters.sort)}
            aria-label="Sort ideas"
            className="rounded-lg border border-gray-300 py-2 px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="recent">Most recent</option>
            <option value="type">Type</option>
            <option value="last_reviewed">Last reviewed</option>
          </select>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {chips.map((chip) => (
              <FilterChip key={chip.key} label={chip.label} onRemove={chip.onRemove} />
            ))}
            {activeCount > 1 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-gray-400 hover:text-gray-600 underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Result count */}
        {!isLoading && !isError && (
          <p className="mb-3 text-sm text-gray-500">{resultLabel}</p>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3" aria-label="Loading ideas">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load ideas. Please refresh and try again.
          </div>
        )}

        {/* List */}
        {!isLoading && !isError && ideas.length > 0 && (
          <ul className="space-y-2">
            {ideas.map((idea) => {
              const ideaProject = idea.projectId
                ? projects.find((p) => p.id === idea.projectId)
                : undefined;
              return (
                <li key={idea.id}>
                  <IdeaCard
                    idea={idea}
                    projectName={!filters.projectId ? ideaProject?.title : undefined}
                    listContext={location.search}
                    onAssign={() => setAssignTarget({ id: idea.id, projectId: idea.projectId })}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {/* Empty state */}
        {!isLoading && !isError && ideas.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-16 text-center">
            {filters.q ? (
              <>
                <p className="text-gray-500 text-sm mb-3">
                  No ideas match &ldquo;{filters.q}&rdquo;
                </p>
                <button
                  type="button"
                  onClick={() => openModal({ content: filters.q })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                >
                  <span aria-hidden className="text-base leading-none">+</span>
                  Capture &ldquo;{filters.q}&rdquo; as idea
                </button>
              </>
            ) : (
              <>
                <p className="text-gray-500 text-sm mb-3">
                  {filters.type || filters.projectId || filters.archived
                    ? 'No ideas match the active filters.'
                    : 'No ideas yet. Capture your first one!'}
                </p>
                {!filters.archived && (
                  <button
                    type="button"
                    onClick={() => openModal()}
                    className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                  >
                    <span aria-hidden className="text-base leading-none">+</span>
                    Capture an idea
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Quick-assign modal — opened from IdeaCard overflow "Assign to project…" */}
    {assignTarget && (
      <QuickAssignModal
        ideaId={assignTarget.id}
        currentProjectId={assignTarget.projectId}
        onClose={() => setAssignTarget(null)}
      />
    )}
    </>
  );
}
