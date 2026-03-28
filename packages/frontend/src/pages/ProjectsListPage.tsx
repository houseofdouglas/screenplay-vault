import React from 'react';
import { Link } from 'react-router-dom';
import { useProjects } from '../api/hooks/projects.js';
import { useCreateProjectStore } from '../store/create-project-store.js';
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
// Page
// ---------------------------------------------------------------------------

/**
 * Projects List page at `/projects`.
 *
 * Displays all projects sorted by `updatedAt` descending with status, logline
 * and idea count. A "+ New Project" button opens the Create Project Modal.
 */
export function ProjectsListPage(): React.ReactElement {
  const { data, isLoading, isError } = useProjects();
  const openCreateProject = useCreateProjectStore((s) => s.open);

  const projects = data?.data ?? [];

  return (
    <div className="min-h-full">
      {/* Page header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-semibold text-gray-900">Projects</h1>
        <button
          type="button"
          onClick={() => openCreateProject()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <path d="M8 3.5a.75.75 0 0 1 .75.75v3h3a.75.75 0 0 1 0 1.5h-3v3a.75.75 0 0 1-1.5 0v-3h-3a.75.75 0 0 1 0-1.5h3v-3A.75.75 0 0 1 8 3.5Z" />
          </svg>
          New Project
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {isLoading && (
          <div className="space-y-3" aria-label="Loading projects">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            Failed to load projects. Please refresh.
          </div>
        )}

        {!isLoading && !isError && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-4 text-4xl">🎬</div>
            <h2 className="text-base font-semibold text-gray-900">No projects yet</h2>
            <p className="mt-1 text-sm text-gray-500 max-w-xs">
              Create your first project to start organising your ideas into a screenplay.
            </p>
            <button
              type="button"
              onClick={() => openCreateProject()}
              className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              + New Project
            </button>
          </div>
        )}

        {!isLoading && !isError && projects.length > 0 && (
          <ul className="space-y-2" aria-label="Projects">
            {projects.map((project) => (
              <li key={project.id}>
                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 hover:border-indigo-200 hover:shadow-sm transition-all"
                >
                  {/* Title + logline */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm truncate">
                        {project.title}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[project.status]}`}
                      >
                        {STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    {project.logline ? (
                      <p className="mt-0.5 text-sm text-gray-500 truncate">{project.logline}</p>
                    ) : (
                      <p className="mt-0.5 text-sm text-gray-400 italic">No logline yet</p>
                    )}
                  </div>

                  {/* Meta */}
                  <div className="shrink-0 text-right">
                    <p className="text-sm text-gray-700">
                      {project.ideaCount}{' '}
                      <span className="text-gray-400">
                        {project.ideaCount === 1 ? 'idea' : 'ideas'}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
}
