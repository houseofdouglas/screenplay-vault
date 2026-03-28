import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { useIdeasFilters } from './useIdeasFilters.js';

// ---------------------------------------------------------------------------
// Wrapper factory — lets us set initial URL params
// ---------------------------------------------------------------------------

function wrapper(initialSearch = '') {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      MemoryRouter,
      { initialEntries: [`/ideas${initialSearch}`] },
      children
    );
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useIdeasFilters', () => {
  describe('initial state from URL params', () => {
    it('defaults to no filters when URL has no params', () => {
      const { result } = renderHook(() => useIdeasFilters(), { wrapper: wrapper() });
      expect(result.current.filters.type).toBeUndefined();
      expect(result.current.filters.projectId).toBeUndefined();
      expect(result.current.filters.q).toBeUndefined();
      expect(result.current.filters.sort).toBe('recent');
      expect(result.current.filters.archived).toBe(false);
    });

    it('reads type filter from URL', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?type=WHAT_IF'),
      });
      expect(result.current.filters.type).toBe('WHAT_IF');
    });

    it('reads untyped filter from URL', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?type=untyped'),
      });
      expect(result.current.filters.type).toBe('untyped');
    });

    it('reads archived=true from URL', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?archived=true'),
      });
      expect(result.current.filters.archived).toBe(true);
    });

    it('reads sort from URL', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?sort=last_reviewed'),
      });
      expect(result.current.filters.sort).toBe('last_reviewed');
    });

    it('reads projectId from URL', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?projectId=proj-123'),
      });
      expect(result.current.filters.projectId).toBe('proj-123');
    });
  });

  describe('setters', () => {
    it('setType updates the type filter', () => {
      const { result } = renderHook(() => useIdeasFilters(), { wrapper: wrapper() });
      act(() => result.current.setType('CHARACTER'));
      expect(result.current.filters.type).toBe('CHARACTER');
    });

    it('setType(undefined) clears the type filter', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?type=SCENE'),
      });
      act(() => result.current.setType(undefined));
      expect(result.current.filters.type).toBeUndefined();
    });

    it('setProjectId updates the project filter', () => {
      const { result } = renderHook(() => useIdeasFilters(), { wrapper: wrapper() });
      act(() => result.current.setProjectId('proj-abc'));
      expect(result.current.filters.projectId).toBe('proj-abc');
    });

    it('setSort updates the sort option', () => {
      const { result } = renderHook(() => useIdeasFilters(), { wrapper: wrapper() });
      act(() => result.current.setSort('type'));
      expect(result.current.filters.sort).toBe('type');
    });

    it('setArchived(true) sets archived flag', () => {
      const { result } = renderHook(() => useIdeasFilters(), { wrapper: wrapper() });
      act(() => result.current.setArchived(true));
      expect(result.current.filters.archived).toBe(true);
    });
  });

  describe('clearFilters', () => {
    it('resets all filters to defaults', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?type=THEME&sort=type&archived=true&projectId=p1'),
      });
      act(() => result.current.clearFilters());
      expect(result.current.filters.type).toBeUndefined();
      expect(result.current.filters.sort).toBe('recent');
      expect(result.current.filters.archived).toBe(false);
      expect(result.current.filters.projectId).toBeUndefined();
    });
  });

  describe('activeCount', () => {
    it('returns 0 when no filters are active', () => {
      const { result } = renderHook(() => useIdeasFilters(), { wrapper: wrapper() });
      expect(result.current.activeCount).toBe(0);
    });

    it('counts each active non-default filter', () => {
      const { result } = renderHook(() => useIdeasFilters(), {
        wrapper: wrapper('?type=SCENE&sort=type&archived=true'),
      });
      // type + sort + archived = 3
      expect(result.current.activeCount).toBe(3);
    });
  });

  describe('search debounce (local state)', () => {
    it('setSearch updates local search state immediately', () => {
      const { result } = renderHook(() => useIdeasFilters(), { wrapper: wrapper() });
      act(() => result.current.setSearch('detective'));
      expect(result.current.search).toBe('detective');
    });
  });
});
