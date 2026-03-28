import React, { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TopNav } from './TopNav.js';
import { Sidebar } from './Sidebar.js';
import { QuickCaptureModal } from '../components/QuickCaptureModal.js';
import { CreateProjectModal } from '../components/CreateProjectModal.js';
import { useQuickCaptureStore } from '../store/quick-capture-store.js';
import { useCreateProjectStore } from '../store/create-project-store.js';

/**
 * AppShell — persistent layout wrapper for all authenticated screens.
 *
 * Structure:
 * - Fixed TopNav at the top (z-20)
 * - Fixed Sidebar on the left (below TopNav)
 * - Scrollable main content area to the right of the sidebar
 * - QuickCaptureModal rendered here (portal-like, z-50)
 * - react-hot-toast Toaster for app-wide notifications
 *
 * Keyboard shortcut: `N` opens the Quick Capture Modal unless focus is inside
 * a text input / textarea / contenteditable element.
 */
export function AppShell(): React.ReactElement {
  const openModal = useQuickCaptureStore((s) => s.open);
  const openCreateProject = useCreateProjectStore((s) => s.open);
  const createProjectOpen = useCreateProjectStore((s) => s.isOpen);
  const closeCreateProject = useCreateProjectStore((s) => s.close);

  // Mobile sidebar drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const handleFabClick = useCallback(() => {
    openModal();
  }, [openModal]);

  const handleNewProject = useCallback(() => {
    openCreateProject();
  }, [openCreateProject]);

  // Global `N` keyboard shortcut — opens Quick Capture Modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if modifier keys are held (⌘N, Ctrl+N, etc.)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'n' && e.key !== 'N') return;

      // Ignore if focus is inside a text field
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      if (
        tag === 'input' ||
        tag === 'textarea' ||
        tag === 'select' ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();
      openModal();
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openModal]);

  return (
    <>
      <TopNav onFabClick={handleFabClick} onMenuClick={openSidebar} />
      <Sidebar onNewProject={handleNewProject} isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Mobile backdrop — tapping it closes the drawer */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          aria-hidden="true"
          onClick={closeSidebar}
        />
      )}

      {/* Main content area — full-width on mobile, offset by sidebar on md+ */}
      <main className="mt-14 md:ml-56 min-h-[calc(100vh-3.5rem)] bg-gray-50">
        <Outlet />
      </main>

      {/* Quick Capture Modal */}
      <QuickCaptureModal />

      {/* Create Project Modal — triggered by Sidebar "+ New Project" or any component */}
      {createProjectOpen && (
        <CreateProjectModal onClose={closeCreateProject} />
      )}

      {/* App-wide toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '8px',
            background: '#1f2937',
            color: '#f9fafb',
          },
        }}
      />
    </>
  );
}
