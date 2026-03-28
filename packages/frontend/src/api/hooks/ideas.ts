import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client.js';
import type { Idea, IdeasListMeta } from 'shared';
import type { CreateIdeaInput, PatchIdeaInput, ListIdeasQuery } from 'shared';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const ideaKeys = {
  all: ['ideas'] as const,
  list: (params?: Partial<ListIdeasQuery>) => ['ideas', 'list', params ?? {}] as const,
  detail: (id: string) => ['ideas', 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface IdeasListResponse {
  data: Idea[];
  meta: IdeasListMeta;
}

interface IdeaResponse {
  data: Idea;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Fetch the paginated, filtered list of ideas. */
export function useIdeas(params?: Partial<ListIdeasQuery>) {
  return useQuery({
    queryKey: ideaKeys.list(params),
    queryFn: () =>
      apiRequest<IdeasListResponse>('/ideas', {
        params: params as Record<string, string | undefined>,
      }),
  });
}

/** Fetch a single idea by ID. */
export function useIdea(id: string) {
  return useQuery({
    queryKey: ideaKeys.detail(id),
    queryFn: () => apiRequest<IdeaResponse>(`/ideas/${id}`),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Create a new idea. Invalidates the ideas list. */
export function useCreateIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateIdeaInput) =>
      apiRequest<IdeaResponse>('/ideas', { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ideaKeys.all });
    },
  });
}

/** Patch an existing idea. Invalidates the list and the specific detail. */
export function usePatchIdea(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatchIdeaInput) =>
      apiRequest<IdeaResponse>(`/ideas/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ideaKeys.all });
      void qc.invalidateQueries({ queryKey: ideaKeys.detail(id) });
    },
  });
}

/** Soft-archive an idea (DELETE → sets archivedAt). Invalidates the list. */
export function useArchiveIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<IdeaResponse>(`/ideas/${id}`, { method: 'DELETE' }),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ideaKeys.all });
      void qc.invalidateQueries({ queryKey: ideaKeys.detail(id) });
    },
  });
}

/**
 * Assign multiple ideas to a project in parallel.
 * Also invalidates the projects list so idea counts refresh.
 */
export function useBulkAssignIdeas(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ideaIds: string[]) =>
      Promise.all(
        ideaIds.map((id) =>
          apiRequest<IdeaResponse>(`/ideas/${id}`, {
            method: 'PATCH',
            body: { projectId },
          })
        )
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ideaKeys.all });
      void qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

/** Restore a soft-archived idea. Invalidates the list and detail. */
export function useRestoreIdea() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<IdeaResponse>(`/ideas/${id}/restore`, { method: 'PATCH' }),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: ideaKeys.all });
      void qc.invalidateQueries({ queryKey: ideaKeys.detail(id) });
    },
  });
}
