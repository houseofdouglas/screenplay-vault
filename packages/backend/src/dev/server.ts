/**
 * Local development server.
 *
 * Runs the Hono app via @hono/node-server on port 3000.
 * Auth is bypassed: DEV_USER_ID from .env.local is injected as userId.
 * DB is backed by LocalFileS3Client writing to ./local-data/.
 *
 * Start with: pnpm dev:backend  (requires pnpm build first)
 */

import { serve } from '@hono/node-server';
import { createApp } from '../app.js';

const app = createApp();
const port = 3000;

serve({ fetch: app.fetch, port }, (info) => {
  process.stdout.write(
    JSON.stringify({ level: 'info', message: 'Dev server started', port: info.port }) + '\n',
  );
});
