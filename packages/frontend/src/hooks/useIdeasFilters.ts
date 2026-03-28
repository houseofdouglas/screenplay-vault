import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IdeaType } from 'shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortOption = 'recent' | 'type' | 'last_reviewed';

/** The active filter state — mirrors URL search params. */
export interface IdeasFilters {
  /** An IdeaType to filter by, 'untyped' for null-type ideas, or undefined for all. */
  type: IdeaType | 'untyped' | undefined;
  /** Project ID to filter by, 'unassigned' for ideas with no project, or undefined. */
  projectId: string | undefined;
  /** Keyword search string. */
  q: string | undefined;
  /** Sort order. Defaults to 'recent'. */
  sort: SortOption;
  /** When true, show only archived ideas. */
  archived: boolean;
  /** When true, show only stale ideas (not reviewed in >14 days). */
  stale: boolean;
}

const SORT_OPTIONS: Record<SortOption, string> = {
  recent: 'Most recent',
  type: 'Type',
  last_reviewed: 'Last reviewed',
};

export const SORT_LABELS = SORT_OPTIONS;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the Ideas List filter state, synchronized with URL search params.
 *
 * Reads initial state from the URL (enabling bookmarkable / shareable URLs).
 * All mutations update the URL via `useSearchParams` — React Router will
 * re-render the component with the new params.
 */
export function useIdeasFilters(): {
  filters: IdeasFilters;
  search: string;
  setSearch: (q: string) => void;
  setType: (type: IdeaType | 'untyped' | undefined) => void;
  setProjectId: (id: string | undefined) => void;
  setSort: (sort: SortOption) => void;
  setArchived: (archived: boolean) => void;
  setStale: (stale: boolean) => void;
  clearFilters: () => void;
  activeCount: number;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive filters from URL params
  const typeParam = searchParams.get('type') ?? undefined;
  const projectIdParam = searchParams.get('projectId') ?? undefined;
  const qParam = searchParams.get('q') ?? undefined;
  const sortParam = (searchParams.get('sort') ?? 'recent') as SortOption;
  const archivedParam = searchParams.get('archived') === 'true';
  const staleParam = searchParams.get('stale') === 'true';

  const filters: IdeasFilters = {
    type: typeParam as IdeaType | 'untyped' | undefined,
    projectId: projectIdParam,
    q: qParam,
    sort: sortParam,
    archived: archivedParam,
    stale: staleParam,
  };

  // Local search state for debouncing (doesn't immediately hit the URL)
  const [search, setSearchLocal] = useState(qParam ?? '');

  // Sync local search state when the URL q param changes externally
  useEffect(() => {
    setSearchLocal(qParam ?? '');
  }, [qParam]);

  // Debounce: flush local search to URL after 300ms of inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (search.trim()) {
            next.set('q', search.trim());
          } else {
            next.delete('q');
          }
          return next;
        },
        { replace: true }
      );
    }, 300);
    return () => clearTimeout(timer);
  }, [search, setSearchParams]);

  const setType = useCallback(
    (type: IdeaType | 'untyped' | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (type) next.set('type', type);
          else next.delete('type');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setProjectId = useCallback(
    (id: string | undefined) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (id) next.set('projectId', id);
          else next.delete('projectId');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setSort = useCallback(
    (sort: SortOption) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (sort === 'recent') next.delete('sort');
          else next.set('sort', sort);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setArchived = useCallback(
    (archived: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (archived) next.set('archived', 'true');
          else next.delete('archived');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const setStale = useCallback(
    (stale: boolean) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (stale) next.set('stale', 'true');
          else next.delete('stale');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setSearchLocal('');
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Count of non-default active filters (for display)
  const activeCount =
    (filters.type ? 1 : 0) +
    (filters.projectId ? 1 : 0) +
    (filters.q ? 1 : 0) +
    (filters.sort !== 'recent' ? 1 : 0) +
    (filters.archived ? 1 : 0) +
    (filters.stale ? 1 : 0);

  return {
    filters,
    search,
    setSearch: setSearchLocal,
    setType,
    setProjectId,
    setSort,
    setArchived,
    setStale,
    clearFilters,
    activeCount,
  };
}
