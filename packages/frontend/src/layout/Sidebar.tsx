import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useProjects } from '../api/hooks/projects.js';

interface SidebarProps {
  /** Called when "+ New Project" is clicked. */
  onNewProject: () => void;
  /** Whether the drawer is open (mobile only — ignored on md+). */
  isOpen: boolean;
  /** Called when any nav link is tapped, or the backdrop is clicked. */
  onClose: () => void;
}

function SidebarLink({
  to,
  children,
  onClose,
}: {
  to: string;
  children: React.ReactNode;
  onClose: () => void;
}): React.ReactElement {
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) =>
        `flex items-center min-h-[44px] rounded-md px-3 py-2 text-sm transition-colors ${
          isActive
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        }`
      }
    >
      {children}
    </NavLink>
  );
}

/**
 * Left sidebar navigation.
 *
 * Desktop (md+): fixed, always visible.
 * Mobile: off-canvas drawer; slides in when `isOpen` is true, slides out when false.
 *
 * Inbox section: static links to `/ideas` with pre-applied URL filters.
 * Projects section: dynamically lists projects from the API + a "+ New Project" action.
 */
export function Sidebar({ onNewProject, isOpen, onClose }: SidebarProps): React.ReactElement {
  const { data: projectsData } = useProjects();
  const navigate = useNavigate();

  return (
    <aside
      className={[
        // Base — fixed panel, always full-height below TopNav
        'fixed left-0 top-14 bottom-0 w-64 bg-white border-r border-gray-200 overflow-y-auto flex flex-col',
        // Transition for the mobile drawer slide
        'transition-transform duration-200 ease-in-out',
        // z-index: above backdrop (z-20) but below TopNav (z-40)
        'z-30',
        // Mobile: hidden by default, shown when open
        isOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: always visible, ignore isOpen
        'md:translate-x-0',
      ].join(' ')}
    >
      <nav className="flex-1 p-3 space-y-6">
        {/* Inbox section */}
        <section>
          <h2 className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Inbox
          </h2>
          <ul className="space-y-0.5">
            <li>
              <SidebarLink to="/ideas" onClose={onClose}>All Ideas</SidebarLink>
            </li>
            <li>
              <SidebarLink to="/ideas?stale=true" onClose={onClose}>Stale ideas</SidebarLink>
            </li>
            <li>
              {/* Raw / Untyped: ideas where type is null */}
              <SidebarLink to="/ideas?type=untyped" onClose={onClose}>Raw / Untyped</SidebarLink>
            </li>
            <li>
              <SidebarLink to="/ideas?archived=true" onClose={onClose}>Archived</SidebarLink>
            </li>
          </ul>
        </section>

        {/* Projects section */}
        <section>
          <h2 className="px-3 mb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Projects
          </h2>
          <ul className="space-y-0.5">
            {projectsData?.data.map((project) => (
              <li key={project.id}>
                <NavLink
                  to={`/projects/${project.id}`}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center min-h-[44px] rounded-md px-3 py-2 text-sm truncate transition-colors ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`
                  }
                  title={project.title}
                >
                  {project.title}
                </NavLink>
              </li>
            ))}

            <li>
              <button
                type="button"
                onClick={() => {
                  onNewProject();
                  onClose();
                  void navigate('/projects');
                }}
                className="w-full text-left flex items-center min-h-[44px] rounded-md px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                + New Project
              </button>
            </li>
          </ul>
        </section>
      </nav>
    </aside>
  );
}
