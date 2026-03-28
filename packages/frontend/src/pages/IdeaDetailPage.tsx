import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useIdea, useIdeas, usePatchIdea, useArchiveIdea, useRestoreIdea } from '../api/hooks/ideas.js';
import { useProjects } from '../api/hooks/projects.js';
import { IDEA_TYPE_LABELS } from '../components/IdeaCard.js';
import { InlineEdit } from '../components/InlineEdit.js';
import { ExcitementWidget } from '../components/ExcitementWidget.js';
import type { Idea, IdeaType, ListIdeasQuery } from 'shared';
import { IDEA_TYPES } from 'shared';

// ---------------------------------------------------------------------------
// Constants + helpers
// ---------------------------------------------------------------------------

const STALE_CUTOFF_MS = 14 * 24 * 60 * 60 * 1000;

function isStale(idea: Idea): boolean {
  const cutoff = Date.now() - STALE_CUTOFF_MS;
  const ts = idea.lastReviewedAt
    ? new Date(idea.lastReviewedAt).getTime()
    : new Date(idea.createdAt).getTime();
  return ts < cutoff;
}

function staleDays(idea: Idea): number {
  const ref = idea.lastReviewedAt ?? idea.createdAt;
  return Math.floor((Date.now() - new Date(ref).getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Parse a URL search string into API params, mirroring the logic in IdeasListPage.
 * The 'untyped' sentinel is excluded from the API call (handled client-side).
 */
function parseListParams(search: string): Partial<ListIdeasQuery> {
  const params = new URLSearchParams(search);
  const result: Partial<ListIdeasQuery> = {};

  const type = params.get('type');
  if (type && type !== 'untyped') result.type = type as IdeaType;

  const projectId = params.get('projectId');
  if (projectId) result.projectId = projectId;

  const q = params.get('q');
  if (q) result.q = q;

  const sort = params.get('sort') as ListIdeasQuery['sort'] | null;
  if (sort) result.sort = sort;

  const archived = params.get('archived');
  result.archived = archived === 'true' ? 'true' : 'false';

  return result;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * Idea Detail page at `/ideas/:ideaId`.
 *
 * Shows full idea content (inline-editable), tags (inline-editable), stale/raw/archived
 * banners, breadcrumb with ‹ › prev/next navigation (preserving list filter context),
 * and a right sidebar with excitement rating, project/type dropdowns, dates, and archive.
 */
export function IdeaDetailPage(): React.ReactElement {
  const { ideaId } = useParams<{ ideaId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // List search string passed via router state when navigating from the Ideas List.
  const listSearch =
    (location.state as { listSearch?: string } | null)?.listSearch ?? '';

  // Ref to focus the type dropdown via the "Set type now" link in the raw banner.
  const typeSelectRef = useRef<HTMLSelectElement>(null);

  // ── Data fetching ────────────────────────────────────────────────────────

  const { data, isLoading, isError } = useIdea(ideaId!);
  const idea = data?.data ?? null;

  const { data: projectsData } = useProjects();
  const projects = projectsData?.data ?? [];

  // Fetch the ordered list in the same filter context so we can compute prev/next IDs.
  const listParams = useMemo(() => parseListParams(listSearch), [listSearch]);
  const isUntypedFilter = useMemo(
    () => new URLSearchParams(listSearch).get('type') === 'untyped',
    [listSearch]
  );
  const { data: listData } = useIdeas(listParams);

  const listIds = useMemo(() => {
    const all = listData?.data ?? [];
    const filtered = isUntypedFilter ? all.filter((i) => i.type === null) : all;
    return filtered.map((i) => i.id);
  }, [listData?.data, isUntypedFilter]);

  const currentIndex = listIds.indexOf(ideaId!);
  const prevId = currentIndex > 0 ? listIds[currentIndex - 1] : null;
  const nextId = currentIndex < listIds.length - 1 ? listIds[currentIndex + 1] : null;

  // ── Tags local state (optimistic) ───────────────────────────────────────

  const [tags, setTags] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  // Sync tags from server whenever the idea changes.
  const tagsKey = idea?.tags.join(',') ?? '';
  useEffect(() => {
    if (idea) setTags(idea.tags);
  }, [idea?.id, tagsKey]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const patchIdea = usePatchIdea(ideaId!);
  const archiveIdea = useArchiveIdea();
  const restoreIdea = useRestoreIdea();

  // ── Handlers ─────────────────────────────────────────────────────────────

  async function handleSaveContent(content: string): Promise<void> {
    await patchIdea.mutateAsync({ content });
  }

  function handleExcitementChange(value: 1 | 2 | 3 | null): void {
    patchIdea.mutate({ excitement: value, lastReviewedAt: new Date().toISOString() });
  }

  function handleProjectChange(projectId: string | null): void {
    patchIdea.mutate({ projectId });
  }

  function handleTypeChange(type: IdeaType | null): void {
    patchIdea.mutate({ type });
  }

  function handleMarkReviewed(): void {
    patchIdea.mutate({ lastReviewedAt: new Date().toISOString() });
  }

  function handleRemoveTag(tag: string): void {
    const newTags = tags.filter((t) => t !== tag);
    setTags(newTags);
    patchIdea.mutate({ tags: newTags });
  }

  function handleAddTagSubmit(): void {
    const trimmed = newTagInput.trim();
    if (!trimmed) {
      setAddingTag(false);
      setNewTagInput('');
      return;
    }
    if (trimmed.length > 50) {
      setTagError('Tags must be 50 characters or less.');
      return;
    }
    if (tags.includes(trimmed)) {
      setAddingTag(false);
      setNewTagInput('');
      return;
    }
    const newTags = [...tags, trimmed];
    setTags(newTags);
    patchIdea.mutate({ tags: newTags });
    setAddingTag(false);
    setNewTagInput('');
    setTagError(null);
  }

  function handleArchive(): void {
    archiveIdea.mutate(ideaId!, {
      onSuccess: () => {
        void navigate('/ideas');
        toast(
          (t) => (
            <span className="flex items-center gap-2 text-sm">
              Idea archived
              <button
                type="button"
                className="underline font-medium"
                onClick={() => {
                  restoreIdea.mutate(ideaId!);
                  toast.dismiss(t.id);
                }}
              >
                Undo
              </button>
            </span>
          ),
          { duration: 5000, icon: '🗄️' }
        );
      },
    });
  }

  function handleRestore(): void {
    restoreIdea.mutate(ideaId!);
  }

  function navigateTo(targetId: string): void {
    void navigate(`/ideas/${targetId}`, { state: { listSearch } });
  }

  // ── Loading / error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" aria-label="Loading idea">
        <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (isError || !idea) {
    return (
      <div className="p-6 max-w-lg">
        <h1 className="text-xl font-semibold text-gray-900">Idea not found</h1>
        <p className="mt-2 text-gray-500 text-sm">
          This idea doesn&rsquo;t exist or you don&rsquo;t have access to it.
        </p>
        <Link
          to="/ideas"
          className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          ← Back to Ideas
        </Link>
      </div>
    );
  }

  const stale = isStale(idea);
  const untyped = idea.type === null;
  const archived = idea.archivedAt !== null;
  const projectName = projects.find((p) => p.id === idea.projectId)?.title;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Breadcrumb + nav arrows ────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white shrink-0">
        <Link
          to="/ideas"
          state={{ listSearch }}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Ideas
        </Link>
        <span className="text-gray-300 text-sm" aria-hidden>›</span>
        <span
          className="text-sm text-gray-900 truncate max-w-xs sm:max-w-md"
          title={idea.content}
        >
          {idea.content.length > 60 ? `${idea.content.slice(0, 60)}…` : idea.content}
        </span>

        <div className="ml-auto flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => prevId && navigateTo(prevId)}
            disabled={!prevId}
            aria-label="Previous idea"
            className="rounded px-2 py-1 text-lg leading-none text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => nextId && navigateTo(nextId)}
            disabled={!nextId}
            aria-label="Next idea"
            className="rounded px-2 py-1 text-lg leading-none text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Banners ────────────────────────────────────────────────── */}
      <div className="px-6 space-y-3 mt-4">
        {archived && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>This idea is archived.</span>
            <button
              type="button"
              onClick={handleRestore}
              className="font-medium underline hover:text-amber-900 ml-4 whitespace-nowrap"
            >
              Restore
            </button>
          </div>
        )}

        {stale && !archived && (
          <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span>
              {staleDays(idea)} days without a review — still excited about this?
            </span>
            <button
              type="button"
              onClick={handleMarkReviewed}
              className="font-medium underline hover:text-amber-900 ml-4 whitespace-nowrap"
            >
              Mark as reviewed
            </button>
          </div>
        )}

        {untyped && !archived && (
          <div className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
            <span>This idea has no type yet.</span>
            <button
              type="button"
              onClick={() => typeSelectRef.current?.focus()}
              className="font-medium underline hover:text-indigo-900 ml-4 whitespace-nowrap"
            >
              Set type now
            </button>
          </div>
        )}
      </div>

      {/* ── Main content + sidebar ─────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Main content area */}
        <div className="flex-1 min-w-0 px-6 py-5 overflow-y-auto">

          {/* Type badge */}
          <div className="mb-3">
            {idea.type ? (
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700">
                {IDEA_TYPE_LABELS[idea.type]}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-dashed border-gray-400 px-3 py-1 text-sm font-medium text-gray-500">
                UNTYPED
              </span>
            )}
            {projectName && (
              <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">
                {projectName}
              </span>
            )}
          </div>

          {/* Inline-editable content */}
          <InlineEdit
            value={idea.content}
            onSave={handleSaveContent}
            rows={6}
            className="text-gray-900 text-base leading-relaxed"
            placeholder="Idea content…"
          />

          {/* Tags */}
          <div className="mt-7">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Tags
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-sm text-gray-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    aria-label={`Remove tag ${tag}`}
                    className="rounded-full p-0.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
                      <path d="M3.28 2.22a.75.75 0 0 0-1.06 1.06L4.94 6 2.22 8.72a.75.75 0 1 0 1.06 1.06L6 7.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L7.06 6l2.72-2.72a.75.75 0 0 0-1.06-1.06L6 4.94 3.28 2.22Z" />
                    </svg>
                  </button>
                </span>
              ))}

              {addingTag ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => {
                      setNewTagInput(e.target.value);
                      setTagError(null);
                    }}
                    onBlur={handleAddTagSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTagSubmit();
                      }
                      if (e.key === 'Escape') {
                        setAddingTag(false);
                        setNewTagInput('');
                        setTagError(null);
                      }
                    }}
                    placeholder="new tag"
                    autoFocus
                    aria-label="New tag"
                    className="w-24 rounded border border-indigo-300 px-2 py-0.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {tagError && (
                    <span className="text-xs text-red-600">{tagError}</span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingTag(true)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  + add tag
                </button>
              )}
            </div>
          </div>

          {/* Activity history (derived from available timestamps) */}
          <div className="mt-9">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Activity
            </h3>
            <ol className="space-y-2.5">
              <li className="flex items-start gap-3 text-sm text-gray-600">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-gray-300 shrink-0" aria-hidden />
                <span>
                  <span className="font-medium">Captured</span>
                  {' — '}
                  {new Date(idea.createdAt).toLocaleString()}
                </span>
              </li>
              {idea.lastReviewedAt && (
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-indigo-300 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium">Last reviewed</span>
                    {' — '}
                    {new Date(idea.lastReviewedAt).toLocaleString()}
                  </span>
                </li>
              )}
              {idea.archivedAt && (
                <li className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-amber-300 shrink-0" aria-hidden />
                  <span>
                    <span className="font-medium">Archived</span>
                    {' — '}
                    {new Date(idea.archivedAt).toLocaleString()}
                  </span>
                </li>
              )}
            </ol>
          </div>
        </div>

        {/* ── Right sidebar ────────────────────────────────────────── */}
        <aside className="w-60 shrink-0 border-l border-gray-200 bg-gray-50 px-5 py-5 space-y-6 overflow-y-auto">

          {/* Excitement */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Excitement
            </h3>
            <ExcitementWidget
              value={idea.excitement}
              onChange={handleExcitementChange}
              disabled={patchIdea.isPending}
            />
          </section>

          {/* Project */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Project
            </h3>
            <select
              value={idea.projectId ?? ''}
              onChange={(e) => handleProjectChange(e.target.value || null)}
              aria-label="Assign to project"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— Unassigned —</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </section>

          {/* Type */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Type
            </h3>
            <select
              ref={typeSelectRef}
              value={idea.type ?? ''}
              onChange={(e) =>
                handleTypeChange((e.target.value as IdeaType) || null)
              }
              aria-label="Idea type"
              className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">— No type yet —</option>
              {IDEA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {IDEA_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </section>

          {/* Dates */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Dates
            </h3>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-xs text-gray-400">Added</dt>
                <dd className="text-gray-700">
                  {new Date(idea.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-400">Last reviewed</dt>
                <dd className="text-gray-700">
                  {idea.lastReviewedAt
                    ? new Date(idea.lastReviewedAt).toLocaleDateString()
                    : 'Never'}
                </dd>
              </div>
            </dl>
          </section>

          {/* Danger zone */}
          {!archived && (
            <section>
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={handleArchive}
                  disabled={archiveIdea.isPending}
                  className="text-sm text-red-600 hover:text-red-800 hover:underline disabled:opacity-50"
                >
                  Archive idea…
                </button>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
