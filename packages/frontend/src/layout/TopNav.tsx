import React from 'react';

interface TopNavProps {
  /** Called when the FAB (+) button is clicked. */
  onFabClick: () => void;
  /** Called when the hamburger menu button is clicked (mobile only). */
  onMenuClick: () => void;
}

/**
 * Top navigation bar.
 *
 * - Mobile: hamburger (☰) on the left opens the sidebar drawer; FAB on the right.
 * - Desktop (md+): hamburger is hidden; sidebar is always visible.
 */
export function TopNav({ onFabClick, onMenuClick }: TopNavProps): React.ReactElement {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-3 md:px-4 shadow-sm">
      <div className="flex items-center gap-2">
        {/* Hamburger — visible on mobile only */}
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={onMenuClick}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
            <path fillRule="evenodd" d="M2 4.75A.75.75 0 0 1 2.75 4h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.75Zm0 10.5a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1-.75-.75ZM2 10a.75.75 0 0 1 .75-.75h14.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 10Z" clipRule="evenodd" />
          </svg>
        </button>

        <span className="font-semibold text-gray-900 tracking-tight">Screenplay Vault</span>
      </div>

      {/* FAB — always visible */}
      <button
        type="button"
        aria-label="Capture new idea"
        onClick={onFabClick}
        className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
      >
        <span aria-hidden="true" className="text-lg leading-none">+</span>
        <span>New idea</span>
      </button>
    </header>
  );
}
