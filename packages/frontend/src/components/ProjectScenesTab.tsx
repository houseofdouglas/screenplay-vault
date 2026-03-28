import React, { useState } from 'react';
import { useScenes } from '../api/hooks/scenes.js';
import { SceneModal } from './SceneModal.js';
import type { Scene, ActCounts } from 'shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActFilter = 'all' | '1' | '2' | '3' | 'unplaced';

interface ActPill {
  key: ActFilter;
  label: string;
  count: (counts: ActCounts) => number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACT_PILLS: ActPill[] = [
  { key: 'all', label: 'All', count: (c) => c.total },
  { key: '1', label: 'Act 1', count: (c) => c[1] },
  { key: '2', label: 'Act 2', count: (c) => c[2] },
  { key: '3', label: 'Act 3', count: (c) => c[3] },
  { key: 'unplaced', label: 'Unplaced', count: (c) => c.unplaced },
];

const ACT_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Act 1',
  2: 'Act 2',
  3: 'Act 3',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProjectScenesTabProps {
  projectId: string;
}

/**
 * Scenes tab within the Project Dashboard.
 *
 * Act filter pill row: All / Act 1 / Act 2 / Act 3 / Unplaced — each with count.
 * Scene cards: full description, optional indented italic dialogue snippet with
 * left-border accent, act badge (top-right). Unplaced scenes get a dashed
 * "UNPLACED" badge and dashed left border.
 * "+ Add scene" button opens AddSceneModal.
 * Each card has a pencil edit icon.
 */
export function ProjectScenesTab({
  projectId,
}: ProjectScenesTabProps): React.ReactElement {
  const [actFilter, setActFilter] = useState<ActFilter>('all');

  type ModalState =
    | { open: false }
    | { open: true; mode: 'add' }
    | { open: true; mode: 'edit'; scene: Scene };

  const [modal, setModal] = useState<ModalState>({ open: false });

  const { data, isLoading, isError } = useScenes(
    projectId,
    actFilter === 'all' ? undefined : actFilter
  );

  const scenes = data?.data ?? [];
  const actCounts: ActCounts = data?.meta.actCounts ?? {
    1: 0, 2: 0, 3: 0, unplaced: 0, total: 0,
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toolbar: act pills + add button */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        {/* Act filter pills */}
        <div className="flex flex-wrap gap-1.5 flex-1" role="group" aria-label="Filter by act">
          {ACT_PILLS.map(({ key, label, count }) => {
            const isActive = actFilter === key;
            const n = count(actCounts);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActFilter(key)}
                aria-pressed={isActive}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium border transition-colors',
                  isActive
                    ? 'bg-indigo-600 border-indigo-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-indigo-300 hover:text-indigo-600',
                ].join(' ')}
              >
                {label}
                <span
                  className={[
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs',
                    isActive ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500',
                  ].join(' ')}
                >
                  {n}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add scene button */}
        <button
          type="button"
          onClick={() => setModal({ open: true, mode: 'add' })}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors shrink-0"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 3.5a.75.75 0 0 1 .75.75v3h3a.75.75 0 0 1 0 1.5h-3v3a.75.75 0 0 1-1.5 0v-3h-3a.75.75 0 0 1 0-1.5h3v-3A.75.75 0 0 1 8 3.5Z" />
          </svg>
          Add scene
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3" aria-label="Loading scenes">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load scenes. Please refresh.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && scenes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4 text-3xl">🎬</div>
          <h3 className="text-base font-semibold text-gray-900">
            {actFilter === 'all' ? 'No scenes yet' : `No scenes in ${actFilter === 'unplaced' ? 'Unplaced' : `Act ${actFilter}`}`}
          </h3>
          {actFilter === 'all' && (
            <p className="mt-1 text-sm text-gray-500">
              Drop scene fragments here — action lines, dialogue snippets, act placements.
            </p>
          )}
          {actFilter === 'all' && (
            <button
              type="button"
              onClick={() => setModal({ open: true, mode: 'add' })}
              className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              + Add scene
            </button>
          )}
        </div>
      )}

      {/* Scene cards */}
      {!isLoading && !isError && scenes.length > 0 && (
        <ul className="space-y-3" aria-label="Scenes">
          {scenes.map((scene) => (
            <li key={scene.id}>
              <SceneCard
                scene={scene}
                onEdit={() => setModal({ open: true, mode: 'edit', scene })}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Modals */}
      {modal.open && modal.mode === 'add' && (
        <SceneModal
          mode="add"
          projectId={projectId}
          onClose={() => setModal({ open: false })}
        />
      )}
      {modal.open && modal.mode === 'edit' && (
        <SceneModal
          mode="edit"
          projectId={projectId}
          scene={modal.scene}
          onClose={() => setModal({ open: false })}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene card
// ---------------------------------------------------------------------------

interface SceneCardProps {
  scene: Scene;
  onEdit: () => void;
}

function SceneCard({ scene, onEdit }: SceneCardProps): React.ReactElement {
  const isUnplaced = scene.position === null;

  return (
    <div
      className={[
        'relative rounded-xl border bg-white px-5 py-4 shadow-sm hover:shadow-md transition-shadow',
        isUnplaced
          ? 'border-dashed border-gray-300'
          : 'border-gray-200',
      ].join(' ')}
    >
      {/* Dashed left border accent for unplaced scenes */}
      {isUnplaced && (
        <div className="absolute left-0 top-4 bottom-4 w-0.5 border-l-2 border-dashed border-gray-400 rounded-full" />
      )}

      {/* Act badge (top-right) */}
      <div className="absolute top-3 right-10 flex items-center gap-1.5">
        {isUnplaced ? (
          <span className="inline-flex items-center rounded border border-dashed border-gray-400 px-2 py-0.5 text-xs font-semibold text-gray-500 tracking-wide">
            UNPLACED
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
            {ACT_LABELS[scene.position as 1 | 2 | 3]}
          </span>
        )}
      </div>

      {/* Edit button */}
      <button
        type="button"
        onClick={onEdit}
        aria-label="Edit scene"
        className="absolute top-3 right-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
          <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61Zm.176 4.823L9.75 4.81l-6.286 6.287.818 2.832 2.83-.81 6.287-6.286ZM13.23 2.134l-1.086 1.086 1.452 1.452 1.086-1.086a.25.25 0 0 0 0-.354l-1.098-1.098a.25.25 0 0 0-.354 0Z" />
        </svg>
      </button>

      {/* Description — full, not truncated */}
      <p className="pr-20 text-sm text-gray-900 leading-relaxed">{scene.description}</p>

      {/* Dialogue snippet — indented italic with left border */}
      {scene.dialogueSnippet && (
        <blockquote className="mt-3 ml-4 border-l-2 border-indigo-300 pl-3">
          <p className="text-sm italic text-gray-600 leading-relaxed">
            {scene.dialogueSnippet}
          </p>
        </blockquote>
      )}
    </div>
  );
}
