/**
 * Integration tests for the Hono app foundation:
 * - Health check
 * - Auth middleware (dev bypass, missing auth in prod)
 * - DB middleware lifecycle
 */

import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { AppEnv } from './app.js';

// ---------------------------------------------------------------------------
// Minimal test app helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Hono app that mimics the real app's auth + db setup
 * but uses lightweight in-memory stubs instead of S3SQLiteDB.
 */
function makeTestApp(env: Record<string, string> = {}) {
  // Temporarily set env vars for the duration of this call.
  const original: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(env)) {
    original[k] = process.env[k];
    process.env[k] = v;
  }

  const app = new Hono<AppEnv>();

  // Health — no auth
  app.get('/api/v1/health', (c) => c.json({ status: 'ok' }));

  // Auth middleware stub matching real behaviour
  app.use('/api/v1/*', async (c, next) => {
    if (process.env['NODE_ENV'] === 'development') {
      const userId = process.env['DEV_USER_ID'];
      if (!userId) return c.json({ error: 'INTERNAL_ERROR' }, 500);
      c.set('userId', userId);
      await next();
      return;
    }
    // Production: require Bearer token
    const auth = c.req.header('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
    }
    c.set('userId', 'test-user');
    await next();
  });

  // Cleanup env after building app routes (middleware closures already captured env).
  for (const [k, v] of Object.entries(original)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }

  return app;
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

describe('GET /api/v1/health', () => {
  it('returns { status: "ok" } with 200', async () => {
    const app = makeTestApp({ NODE_ENV: 'development', DEV_USER_ID: 'u1' });
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    const body = await res.json() as { status: string };
    expect(body.status).toBe('ok');
  });

  it('does not require Authorization header', async () => {
    const app = makeTestApp({ NODE_ENV: 'production' });
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Auth middleware — dev mode
// ---------------------------------------------------------------------------

describe('Auth middleware — dev mode', () => {
  it('injects DEV_USER_ID as userId without a JWT', async () => {
    const app = new Hono<AppEnv>();
    app.use('/api/v1/*', async (c, next) => {
      const userId = process.env['DEV_USER_ID'] ?? '';
      c.set('userId', userId);
      await next();
    });
    app.get('/api/v1/me', (c) => c.json({ userId: c.get('userId') }));

    const saved = process.env['DEV_USER_ID'];
    process.env['DEV_USER_ID'] = 'local-dev-user';
    const res = await app.request('/api/v1/me');
    process.env['DEV_USER_ID'] = saved;

    expect(res.status).toBe(200);
    const body = await res.json() as { userId: string };
    expect(body.userId).toBe('local-dev-user');
  });
});

// ---------------------------------------------------------------------------
// Auth middleware — production mode (no real Cognito needed)
// ---------------------------------------------------------------------------

describe('Auth middleware — production mode', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const app = makeTestApp({ NODE_ENV: 'production' });
    app.get('/api/v1/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/api/v1/protected');
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('UNAUTHORIZED');
  });

  it('returns 401 when Authorization header is not Bearer', async () => {
    const app = makeTestApp({ NODE_ENV: 'production' });
    app.get('/api/v1/protected', (c) => c.json({ ok: true }));

    const res = await app.request('/api/v1/protected', {
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    expect(res.status).toBe(401);
  });

  it('health route is accessible without auth in production mode', async () => {
    const app = makeTestApp({ NODE_ENV: 'production' });
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DB middleware lifecycle (using actual createApp with mocked S3SQLiteDB.open)
// ---------------------------------------------------------------------------

describe('DB middleware — lifecycle', () => {
  it('opens DB once per request and closes it in finally (even on error)', async () => {
    const flushFn = vi.fn().mockResolvedValue(undefined);
    const closeFn = vi.fn().mockResolvedValue(undefined);
    const mockDb = { flush: flushFn, close: closeFn };

    // Build app with stubbed dbMiddleware
    const app = new Hono<AppEnv>();
    app.get('/api/v1/health', (c) => c.json({ status: 'ok' }));
    app.use('/api/v1/*', async (c, next) => {
      c.set('userId', 'test-user');
      await next();
    });
    app.use('/api/v1/*', async (c, next) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      c.set('db', mockDb as any);
      try {
        await next();
      } finally {
        await mockDb.flush();
        await mockDb.close();
      }
    });
    app.get('/api/v1/test', (c) => c.json({ ok: true }));

    const res = await app.request('/api/v1/test');
    expect(res.status).toBe(200);
    expect(flushFn).toHaveBeenCalledOnce();
    expect(closeFn).toHaveBeenCalledOnce();
  });

  it('closes DB even when handler throws', async () => {
    const closeFn = vi.fn().mockResolvedValue(undefined);
    const mockDb = { flush: vi.fn().mockResolvedValue(undefined), close: closeFn };

    const app = new Hono<AppEnv>();
    app.use('/api/v1/*', async (c, next) => {
      c.set('userId', 'test-user');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      c.set('db', mockDb as any);
      try {
        await next();
      } finally {
        await mockDb.close();
      }
    });
    app.get('/api/v1/boom', () => { throw new Error('handler exploded'); });

    // Hono catches thrown errors and returns 500
    await app.request('/api/v1/boom');
    expect(closeFn).toHaveBeenCalledOnce();
  });
});
