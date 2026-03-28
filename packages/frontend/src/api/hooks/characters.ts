import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../client.js';
import { projectKeys } from './projects.js';
import type { Character } from 'shared';
import type { CreateCharacterInput, PatchCharacterInput } from 'shared';

// ---------------------------------------------------------------------------
// Query key factory
// ---------------------------------------------------------------------------

export const characterKeys = {
  all: (projectId: string) => ['projects', projectId, 'characters'] as const,
  list: (projectId: string) => ['projects', projectId, 'characters', 'list'] as const,
};

// ---------------------------------------------------------------------------
// Response shapes
// ---------------------------------------------------------------------------

interface CharactersListResponse {
  data: Character[];
}

interface CharacterResponse {
  data: Character;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

/** Fetch all characters for a project, sorted by createdAt ASC. */
export function useCharacters(projectId: string) {
  return useQuery({
    queryKey: characterKeys.list(projectId),
    queryFn: () => apiRequest<CharactersListResponse>(`/projects/${projectId}/characters`),
    enabled: !!projectId,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

/** Create a new character for a project. Invalidates the characters list. */
export function useCreateCharacter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCharacterInput) =>
      apiRequest<CharacterResponse>(`/projects/${projectId}/characters`, {
        method: 'POST',
        body: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: characterKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}

/** Patch a character. Invalidates the characters list. */
export function usePatchCharacter(projectId: string, charId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PatchCharacterInput) =>
      apiRequest<CharacterResponse>(`/projects/${projectId}/characters/${charId}`, {
        method: 'PATCH',
        body: input,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: characterKeys.all(projectId) });
    },
  });
}

/** Permanently delete a character. Invalidates the characters list and project counts. */
export function useDeleteCharacter(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (charId: string) =>
      apiRequest<void>(`/projects/${projectId}/characters/${charId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: characterKeys.all(projectId) });
      void qc.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
  });
}
