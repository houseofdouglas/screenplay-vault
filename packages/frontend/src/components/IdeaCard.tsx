import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { Idea, IdeaType } from 'shared';
import { useArchiveIdea, useRestoreIdea } from '../api/hooks/ideas.js';
import { PromoteToSceneModal } from './PromoteToSceneModal.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Human-readable label for each idea type, including the "untyped" sentinel. */
export const IDEA_TYPE_LABELS: Record<IdeaType | 'untyped', string> = {
  WHAT_IF: 'What If',
  CHARACTER: 'Character',
  SETTING: 'Setting',
  FIRST_LINE: 'First Line',
  SCENE: 'Scene',
  THEME: 'Theme',
  NEWS_FLASH: 'News Flash',
  untyped: 'Raw / Untyped',
};

const STALE_CUTOFF_MS = 14 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Overflow menu
// ---------------------------------------------------------------------------

interface OverflowMenuProps {
  idea: Idea;
  onClose: () => void;
  onAssign?: () => void;
  onPromoteToScene?: () => void;
}

function OverflowMenu({ idea, onClose, onAssign, onPromoteToScene }: OverflowMenuProps): React.ReactElement {
  const navigate = useNavigate();
  const archiveIdea = useArchiveIdea();
  const restoreIdea = useRestoreIdea();

  function handleViewEdit() {
    onClose();
    void navigate(`/ideas/${idea.id}`);
  }

  function handleAssign() {
    onClose();
    onAssign?.();
  }

  function handleArchive() {
    onClose();
    archiveIdea.mutate(idea.id, {
      onSuccess: () => {
        toast(
          (t) => (
            <span className="flex items-center gap-2 text-sm">
              Idea archived
              <button
                type="button"
                className="underline font-medium"
                onClick={() => {
                  restoreIdea.mutate(idea.id);
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

  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      <button
        type="button"
        role="menuitem"
        onClick={handleViewEdit}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
      >
        View / Edit
      </button>

      <button
        type="button"
        role="menuitem"
        onClick={handleAssign}
        disabled={!onAssign}
        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Assign to project…
      </button>

      {/* WHAT_IF promotion */}
      {idea.type === 'WHAT_IF' && (
        idea.projectId ? (
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              onPromoteToScene?.();
            }}
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
          >
            Promote to Scene…
          </button>
        ) : (
          <button
            type="button"
            role="menuitem"
            disabled
            title="Assign to a project first."
            className="w-full px-4 py-2 text-left text-sm text-gray-400 cursor-not-allowed"
          >
            Promote to Scene…
          </button>
        )
      )}

      <div className="my-1 border-t border-gray-100" />

      <button
        type="button"
        role="menuitem"
        onClick={handleArchive}
        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
      >
        Archive idea
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

export interface IdeaCardProps {
  idea: Idea;
  /** Optional project name to display when not already scoped to a project. */
  projectName?: string;
  /**
   * Called when the user selects "Assign to project…" from the overflow menu.
   * When undefined the menu item is shown but disabled (wired up in T23).
   */
  onAssign?: () => void;
  /**
   * URL search string from the Ideas List (e.g. `?type=WHAT_IF&sort=recent`).
   * Passed as router state so the Detail page can compute ‹ › prev/next navigation.
   */
  listContext?: string;
}

/**
 * Displays a single idea as a card with:
 * - Type badge, 1-line content truncation, tags, excitement dots
 * - Stale indicator: amber left border + age badge (>14 days without review)
 * - Raw/untyped indicator: dashed left border + dashed UNTYPED badge
 * - ⋯ overflow menu: View/Edit, Assign to project, Archive (with 5s undo toast)
 * - WHAT_IF ideas show a (disabled) "Promote to Scene…" option (enabled in T26)
 */
export function IdeaCard({ idea, projectName, onAssign, listContext }: IdeaCardProps): React.ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const stale = isStale(idea);
  const untyped = idea.type === null;

  // Close menu on click outside or Escape
  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Border classes — left border reflects stale/untyped status
  const borderClass = stale
    ? 'border-l-4 border-l-amber-400 border-t border-r border-b border-gray-200'
    : untyped
      ? 'border-l-4 border-l-gray-300 border-t border-r border-b border-dashed border-gray-200'
      : 'border border-gray-200';

  return (
    <div className={`group relative rounded-lg bg-white ${borderClass} hover:shadow-md transition-shadow`}>
      {/* ── Main clickable area ──────────────────────────────────── */}
      <Link
        to={`/ideas/${idea.id}`}
        state={{ listSearch: listContext }}
        className="block p-4 pr-12"
        aria-label={idea.content}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {idea.type ? (
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                  {IDEA_TYPE_LABELS[idea.type]}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-dashed border-gray-400 px-2 py-0.5 text-xs font-medium text-gray-500">
                  UNTYPED
                </span>
              )}
              {stale && (
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {staleDays(idea)} days ago
                </span>
              )}
              {projectName && (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500 truncate max-w-[10rem]">
                  {projectName}
                </span>
              )}
            </div>

            {/* Content preview — 1 line, truncated */}
            <p className="text-sm text-gray-900 truncate">{idea.content}</p>

            {/* Tags */}
            {idea.tags.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {idea.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Excitement dots (display only — interactive on detail page in T20) */}
          <div
            className="flex items-center gap-0.5 shrink-0 mt-1"
            aria-label={`Excitement: ${idea.excitement ?? 'unrated'}`}
          >
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={[
                  'h-2.5 w-2.5 rounded-full',
                  idea.excitement !== null && n <= idea.excitement
                    ? 'bg-indigo-500'
                    : 'border border-gray-300',
                ].join(' ')}
              />
            ))}
          </div>
        </div>

        {/* Date */}
        <div className="mt-2 text-xs text-gray-400">
          {new Date(idea.createdAt).toLocaleDateString()}
        </div>
      </Link>

      {/* ── Overflow menu button ─────────────────────────────────── */}
      <div ref={menuRef} className="absolute top-3 right-3">
        <button
          type="button"
          aria-label="Idea options"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          className={[
            'flex items-center justify-center rounded-md p-1.5 transition-colors',
            menuOpen
              ? 'bg-gray-100 text-gray-700'
              : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700',
          ].join(' ')}
        >
          {/* Three-dot icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <circle cx="3" cy="8" r="1.25" />
            <circle cx="8" cy="8" r="1.25" />
            <circle cx="13" cy="8" r="1.25" />
          </svg>
        </button>

        {menuOpen && (
          <OverflowMenu
            idea={idea}
            onClose={() => setMenuOpen(false)}
            onAssign={onAssign}
            onPromoteToScene={
              idea.type === 'WHAT_IF' && idea.projectId
                ? () => setPromoteOpen(true)
                : undefined
            }
          />
        )}
      </div>

      {/* Promote to Scene modal */}
      {promoteOpen && idea.type === 'WHAT_IF' && idea.projectId && (
        <PromoteToSceneModal
          idea={idea as Idea & { projectId: string }}
          onClose={() => setPromoteOpen(false)}
        />
      )}
    </div>
  );
}
