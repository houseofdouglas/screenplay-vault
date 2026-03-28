import React, { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useProject, usePatchProject } from '../api/hooks/projects.js';
import { InlineEdit } from '../components/InlineEdit.js';
import { EditProjectModal } from '../components/EditProjectModal.js';
import { ProjectIdeasTab } from '../components/ProjectIdeasTab.js';
import { ProjectCharactersTab } from '../components/ProjectCharactersTab.js';
import { ProjectScenesTab } from '../components/ProjectScenesTab.js';
import type { ProjectStatus } from 'shared';

// ---------------------------------------------------------------------------
// Status badge styles
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<ProjectStatus, string> = {
  DEVELOPING: 'bg-indigo-50 text-indigo-700',
  ACTIVE: 'bg-green-50 text-green-700',
  SHELVED: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DEVELOPING: 'Developing',
  ACTIVE: 'Active',
  SHELVED: 'Shelved',
};

// ---------------------------------------------------------------------------
// Tab definitions
// ---------------------------------------------------------------------------

type TabKey = 'ideas' | 'characters' | 'scenes';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'ideas', label: 'Ideas' },
  { key: 'characters', label: 'Characters' },
  { key: 'scenes', label: 'Scenes' },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

/**
 * Project Dashboard at `/projects/:projectId`.
 *
 * Persistent header with inline-editable logline, status badge, "Edit project"
 * modal, and three tabs (Ideas / Characters / Scenes) each showing live counts.
 * Tab content is populated by T23 (Ideas), T24 (Characters), T25 (Scenes).
 */
export function ProjectDashboardPage(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showEditModal, setShowEditModal] = useState(false);

  const activeTab = (searchParams.get('tab') as TabKey | null) ?? 'ideas';

  const { data, isLoading, isError } = useProject(projectId!);
  const project = data?.data ?? null;

  const patchProject = usePatchProject(projectId!);

  async function handleSaveLogline(logline: string): Promise<void> {
    await patchProject.mutateAsync({ logline: logline || null });
  }

  function switchTab(tab: TabKey) {
    setSearchParams(tab === 'ideas' ? {} : { tab });
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" aria-label="Loading project">
        <div className="h-5 w-32 bg-gray-200 animate-pulse rounded" />
        <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
        <div className="h-12 bg-gray-100 animate-pulse rounded-lg" />
      </div>
    );
  }

  // ── 404 ─────────────────────────────────────────────────────────────────

  if (isError || !project) {
    return (
      <div className="p-6 max-w-lg">
        <h1 className="text-xl font-semibold text-gray-900">Project not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          This project doesn&rsquo;t exist or you don&rsquo;t have access to it.
        </p>
        <Link
          to="/projects"
          className="mt-4 inline-block text-sm text-indigo-600 hover:underline"
        >
          ← Back to Projects
        </Link>
      </div>
    );
  }

  // ── Tab counts ───────────────────────────────────────────────────────────

  const tabCounts: Record<TabKey, number> = {
    ideas: project.ideaCount,
    characters: project.characterCount,
    scenes: project.sceneCount,
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Project header ─────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white px-6 py-5">

        {/* Breadcrumb */}
        <nav className="mb-3 flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
          <Link
            to="/projects"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            Projects
          </Link>
          <span className="text-gray-300" aria-hidden>›</span>
          <span className="text-gray-900 font-medium truncate max-w-xs">
            {project.title}
          </span>
        </nav>

        {/* Title row */}
        <div className="flex items-start gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-gray-900 leading-tight">
            {project.title}
          </h1>

          <span
            className={`mt-0.5 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
          >
            {STATUS_LABELS[project.status]}
          </span>

          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="ml-auto mt-0.5 rounded-lg border border-gray-300 px-3 py-1 text-sm text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors shrink-0"
          >
            Edit project
          </button>
        </div>

        {/* Logline — inline editable */}
        <div className="mt-3 -mx-3">
          <InlineEdit
            value={project.logline ?? ''}
            onSave={handleSaveLogline}
            rows={2}
            className="text-sm text-gray-600"
            placeholder="No logline yet — click to add one"
          />
        </div>
      </div>

      {/* ── Tabs ───────────────────────────────────────────────────── */}
      <div className="border-b border-gray-200 bg-white px-6">
        <nav className="flex gap-0 -mb-px" role="tablist" aria-label="Project sections">
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            const count = tabCounts[key];
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => switchTab(key)}
                className={[
                  'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                ].join(' ')}
              >
                {label}
                <span
                  className={[
                    'inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-gray-100 text-gray-500',
                  ].join(' ')}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab content ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {activeTab === 'ideas' && (
          <IdeasTabContent projectId={projectId!} ideaCount={project.ideaCount} />
        )}
        {activeTab === 'characters' && (
          <CharactersTabContent
            projectId={projectId!}
            characterCount={project.characterCount}
          />
        )}
        {activeTab === 'scenes' && (
          <ScenesTabContent projectId={projectId!} sceneCount={project.sceneCount} />
        )}
      </div>

      {/* ── Edit modal ─────────────────────────────────────────────── */}
      {showEditModal && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab content stubs — filled in by T23 / T24 / T25
// ---------------------------------------------------------------------------

interface TabProps {
  projectId: string;
}

/** Ideas tab — toolbar + idea card list. */
function IdeasTabContent({
  projectId,
}: TabProps & { ideaCount: number }): React.ReactElement {
  return <ProjectIdeasTab projectId={projectId} />;
}

/** Characters tab — character card grid. */
function CharactersTabContent({
  projectId,
}: TabProps & { characterCount: number }): React.ReactElement {
  return <ProjectCharactersTab projectId={projectId} />;
}

/** Scenes tab — scene bank. */
function ScenesTabContent({
  projectId,
}: TabProps & { sceneCount: number }): React.ReactElement {
  return <ProjectScenesTab projectId={projectId} />;
}


