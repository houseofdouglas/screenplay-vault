import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client.js';
import { projectKeys } from './projects.js';
import type { Scene, ActCounts } from 'shared';
import type { CreateSceneInput, PatchSceneInput } from 'shared';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const sceneKeys = {
  all: (projectId: string) => ['projects', projectId, 'scenes'] as const,
  list: (projectId: string, act?: string) =>
    ['projects', projectId, 'scenes', 'list', act ?? 'all'] as const,
};

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface ScenesListResponse {
  data: Scene[];
  meta: { actCounts: ActCounts };
}

interface SceneResponse {
  data: Scene;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Fetch all scenes for a project, with optional act filter. */
export function useScenes(projectId: string, act?: '1' | '2' | '3' | 'unplaced') {
  return useQuery({
    queryKey: sceneKeys.list(projectId, act),
    queryFn: () =>
      apiRequest<ScenesListResponse>(`/projects/${projectId}/scenes`, {
        params: act ? { act } : undefined,
      }),
    enabled: !!projectId,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Create a new scene for a project. Invalidates the scenes list and project counts. */
export function useCreateScene(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSceneInput) =>
      apiRequest<SceneResponse>(`/projects/${projectId}/scenes`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sceneKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/** Patch a scene. Invalidates the scenes list. */
export function usePatchScene(projectId: string, sceneId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatchSceneInput) =>
      apiRequest<SceneResponse>(`/projects/${projectId}/scenes/${sceneId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sceneKeys.all(projectId) });
    },
  });
}

/** Permanently delete a scene. Invalidates the scenes list and project counts. */
export function useDeleteScene(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sceneId: string) =>
      apiRequest<void>(`/projects/${projectId}/scenes/${sceneId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: sceneKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
