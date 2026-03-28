/**
 * Raspberry Pi / local-network server.
 *
 * Runs the Hono app via @hono/node-server on PORT (default 8080) and also
 * serves the Vite-built frontend from packages/frontend/dist/.
 *
 * Auth: same bypass as the dev server — set NODE_ENV=development and
 * DEV_USER_ID in .env.pi; no Cognito required.
 *
 * DB: LocalFileS3Client writes SQLite to ./local-data/ (relative to the
 * directory you run the server from; always run from the repo root).
 *
 * Start:
 *   pnpm -r build
 *   node --env-file=packages/backend/.env.pi packages/backend/dist/pi/server.js
 *
 * Or via systemd — see deploy/pi/README.md.
 */

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createApp } from '../app.js';

const app = createApp();
const port = parseInt(process.env['PORT'] ?? '8080', 10);

// ---------------------------------------------------------------------------
// Static file serving — runs only for paths NOT handled by the API routes.
// createApp() registers all /api/v1/* routes above; any handler that returns
// a Response stops the chain so serveStatic is never called for API paths.
//
// Path is relative to process.cwd() — always run from the repo root so that
// `./packages/frontend/dist` resolves correctly.
// ---------------------------------------------------------------------------

// 1. Serve static assets (JS/CSS/images) from the Vite build output.
app.use('/*', serveStatic({ root: './packages/frontend/dist' }));

// 2. SPA fallback — any request that didn't match a file (e.g. /projects/123)
//    gets index.html so React Router can handle it client-side.
app.use('/*', serveStatic({ path: './packages/frontend/dist/index.html' }));

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(
    JSON.stringify({
      level: 'info',
      message: 'Pi server started',
      port: info.port,
      url: `http://localhost:${info.port}`,
    }) + '\n',
  );
});
