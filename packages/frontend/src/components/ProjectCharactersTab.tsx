import React, { useState } from 'react';
import { useCharacters } from '../api/hooks/characters.js';
import { CharacterModal } from './CharacterModal.js';
import type { Character } from 'shared';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProjectCharactersTabProps {
  projectId: string;
}

/**
 * Characters tab within the Project Dashboard.
 *
 * Responsive card grid (CSS grid, min ~220px columns).
 * Each card shows: name, obsession (labelled "Obsession — what drives them"),
 * occupation, and an edit pencil icon.
 * A dashed "+" placeholder card at the end of the grid opens the Add Character modal.
 */
export function ProjectCharactersTab({
  projectId,
}: ProjectCharactersTabProps): React.ReactElement {
  const { data, isLoading, isError } = useCharacters(projectId);
  const characters = data?.data ?? [];

  type ModalState =
    | { open: false }
    | { open: true; mode: 'add' }
    | { open: true; mode: 'edit'; character: Character };

  const [modal, setModal] = useState<ModalState>({ open: false });

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        aria-label="Loading characters"
      >
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        Failed to load characters. Please refresh.
      </div>
    );
  }

  return (
    <>
      {/* Grid of character cards + add placeholder */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
        aria-label="Characters"
      >
        {characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onEdit={() => setModal({ open: true, mode: 'edit', character })}
          />
        ))}

        {/* Dashed "+" add trigger */}
        <button
          type="button"
          onClick={() => setModal({ open: true, mode: 'add' })}
          aria-label="Add character"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-8 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors min-h-[140px]"
        >
          <svg className="h-8 w-8" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
            <path d="M16 6a1.5 1.5 0 0 1 1.5 1.5v7h7a1.5 1.5 0 0 1 0 3h-7v7a1.5 1.5 0 0 1-3 0v-7h-7a1.5 1.5 0 0 1 0-3h7v-7A1.5 1.5 0 0 1 16 6Z" />
          </svg>
          <span className="text-sm font-medium">Add character</span>
        </button>
      </div>

      {/* Modals */}
      {modal.open && modal.mode === 'add' && (
        <CharacterModal
          mode="add"
          projectId={projectId}
          onClose={() => setModal({ open: false })}
        />
      )}
      {modal.open && modal.mode === 'edit' && (
        <CharacterModal
          mode="edit"
          projectId={projectId}
          character={modal.character}
          onClose={() => setModal({ open: false })}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Character card
// ---------------------------------------------------------------------------

interface CharacterCardProps {
  character: Character;
  onEdit: () => void;
}

function CharacterCard({ character, onEdit }: CharacterCardProps): React.ReactElement {
  return (
    <div className="relative rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Edit button */}
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${character.name}`}
        className="absolute top-3 right-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287.818 2.832 2.83-.81 6.287-6.286ZM13.23 2.134l-1.086 1.086 1.452 1.452 1.086-1.086a.25.25 0 0 0 0-.354l-1.098-1.098a.25.25 0 0 0-.354 0Z" />
        </svg>
      </button>

      {/* Name */}
      <h3 className="pr-8 text-base font-semibold text-gray-900 leading-snug">
        {character.name}
      </h3>

      {/* Obsession */}
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Obsession — what drives them
        </p>
        <p className="mt-0.5 text-sm text-gray-700 line-clamp-2">{character.obsession}</p>
      </div>

      {/* Occupation */}
      <div className="mt-2">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Occupation</p>
        <p className="mt-0.5 text-sm text-gray-600">{character.occupation}</p>
      </div>
    </div>
  );
}
