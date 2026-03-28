import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client.js';
import type { ProjectWithCounts } from 'shared';
import type { CreateProjectInput, PatchProjectInput } from 'shared';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const projectKeys = {
  all: ['projects'] as const,
  list: () => ['projects', 'list'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface ProjectsListResponse {
  data: ProjectWithCounts[];
}

interface ProjectResponse {
  data: ProjectWithCounts;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Fetch all projects sorted by updatedAt DESC with aggregate counts. */
export function useProjects() {
  return useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => apiRequest<ProjectsListResponse>('/projects'),
  });
}

/** Fetch a single project by ID with counts. */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => apiRequest<ProjectResponse>(`/projects/${id}`),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Create a new project. Invalidates the projects list. */
export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) =>
      apiRequest<ProjectResponse>('/projects', { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all });
    },
  });
}

/** Patch an existing project. Invalidates the list and the specific detail. */
export function usePatchProject(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatchProjectInput) =>
      apiRequest<ProjectResponse>(`/projects/${id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all });
      void qc.invalidateQueries({ queryKey: projectKeys.detail(id) });
    },
  });
}
