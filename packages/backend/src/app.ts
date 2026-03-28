import { Hono } from 'hono';
import type Database from 'better-sqlite3';
import { authMiddleware } from './middleware/auth.js';
import { dbMiddleware } from './middleware/db.js';
import { registerIdeaRoutes } from './handlers/ideas.js';
import { registerProjectRoutes } from './handlers/projects.js';
import { registerCharacterRoutes } from './handlers/characters.js';
import { registerSceneRoutes } from './handlers/scenes.js';

// ---------------------------------------------------------------------------
// Hono environment type — shared across all middleware and handlers
// ---------------------------------------------------------------------------

export type AppEnv = {
  Variables: {
    userId: string;
    /** The open better-sqlite3 Database for the current request. */
    db: Database.Database;
  };
};

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

/**
 * Creates and returns the configured Hono application instance.
 *
 * Separated from the entry point so the same app can be served by both the
 * Lambda handler (`src/index.ts`) and the local dev server (`src/dev/server.ts`).
 */
export function createApp(): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  // Health — no auth, no DB
  app.get('/api/v1/health', (c) => c.json({ status: 'ok' }));

  // All other /api/v1/* routes require auth + DB
  app.use('/api/v1/*', authMiddleware);
  app.use('/api/v1/*', dbMiddleware);

  // Feature routes
  registerIdeaRoutes(app);
  registerProjectRoutes(app);
  registerCharacterRoutes(app);
  registerSceneRoutes(app);

  return app;
}
