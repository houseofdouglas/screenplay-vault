import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './layout/AppShell.js';
import { ProtectedRoute } from './auth/ProtectedRoute.js';
import { IdeasListPage } from './pages/IdeasListPage.js';
import { IdeaDetailPage } from './pages/IdeaDetailPage.js';
import { ProjectsListPage } from './pages/ProjectsListPage.js';
import { ProjectDashboardPage } from './pages/ProjectDashboardPage.js';

/**
 * Top-level route configuration.
 *
 * All routes under AppShell are protected — unauthenticated users are
 * redirected to /login (which initiates the Cognito PKCE flow in T14/T27).
 * In dev mode, AuthProvider immediately sets isAuthenticated=true so
 * ProtectedRoute never redirects.
 */
export function AppRouter(): React.ReactElement {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/ideas" replace />} />

      {/* Dev-mode login stub — auth is a no-op in dev */}
      <Route
        path="/login"
        element={<Navigate to="/ideas" replace />}
      />

      {/* Protected routes — all rendered inside AppShell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/ideas" element={<IdeasListPage />} />
        <Route path="/ideas/:ideaId" element={<IdeaDetailPage />} />
        <Route path="/projects" element={<ProjectsListPage />} />
        <Route path="/projects/:projectId" element={<ProjectDashboardPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/ideas" replace />} />
    </Routes>
  );
}
