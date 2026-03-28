import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';
import { createProject } from '../repositories/project-repository.js';
import { createScene } from '../repositories/scene-repository.js';
import type { AppEnv } from '../app.js';
import { registerSceneRoutes } from './scenes.js';

// ---------------------------------------------------------------------------
// Test app factory
// ---------------------------------------------------------------------------

function makeTestApp(): { app: Hono<AppEnv>; db: Database.Database } {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);

  const app = new Hono<AppEnv>();
  app.use('*', async (c, next) => {
    c.set('userId', 'test-user');
    c.set('db', db);
    await next();
  });
  registerSceneRoutes(app);
  return { app, db };
}

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:id/scenes
// ---------------------------------------------------------------------------

describe('GET /api/v1/projects/:id/scenes', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('returns { data, meta: { actCounts } } with empty data when no scenes exist', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/scenes');
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[]; meta: { actCounts: Record<string, number> } };
    expect(body.data).toEqual([]);
    expect(body.meta.actCounts).toBeDefined();
    expect(body.meta.actCounts.total).toBe(0);
  });

  it('actCounts always reflects all scenes regardless of act filter', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createScene(db, { id: 's1', projectId: 'p1', description: 'Act 1 scene', position: 1 });
    createScene(db, { id: 's2', projectId: 'p1', description: 'Act 2 scene', position: 2 });
    createScene(db, { id: 's3', projectId: 'p1', description: 'Unplaced', position: null });

    const res = await app.request('/api/v1/projects/p1/scenes?act=1');
    const body = await res.json() as {
      data: { id: string }[];
      meta: { actCounts: { 1: number; 2: number; unplaced: number; total: number } }
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('s1');
    expect(body.meta.actCounts[1]).toBe(1);
    expect(body.meta.actCounts[2]).toBe(1);
    expect(body.meta.actCounts.unplaced).toBe(1);
    expect(body.meta.actCounts.total).toBe(3);
  });

  it('filters by act=unplaced', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createScene(db, { id: 's1', projectId: 'p1', description: 'Act 1', position: 1 });
    createScene(db, { id: 's2', projectId: 'p1', description: 'Unplaced', position: null });

    const res = await app.request('/api/v1/projects/p1/scenes?act=unplaced');
    const body = await res.json() as { data: { id: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe('s2');
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/scenes');
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:id/scenes
// ---------------------------------------------------------------------------

describe('POST /api/v1/projects/:id/scenes', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('creates a scene and returns 201', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'The inciting incident', position: 1 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { description: string; position: number; projectId: string } };
    expect(body.data.description).toBe('The inciting incident');
    expect(body.data.position).toBe(1);
    expect(body.data.projectId).toBe('p1');
  });

  it('creates an unplaced scene when position is omitted', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'A scene without act' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { position: null } };
    expect(body.data.position).toBeNull();
  });

  it('returns 400 when description is empty', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; fields: Record<string, string> };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields.description).toBeDefined();
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/scenes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'A scene' }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/projects/:id/scenes/:sceneId
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/projects/:id/scenes/:sceneId', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('updates scene fields', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createScene(db, { id: 's1', projectId: 'p1', description: 'Original' });
    const res = await app.request('/api/v1/projects/p1/scenes/s1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Updated', position: 2 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { description: string; position: number } };
    expect(body.data.description).toBe('Updated');
    expect(body.data.position).toBe(2);
  });

  it('clears position when set to null', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createScene(db, { id: 's1', projectId: 'p1', description: 'Act 1', position: 1 });
    const res = await app.request('/api/v1/projects/p1/scenes/s1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ position: null }),
    });
    const body = await res.json() as { data: { position: null } };
    expect(body.data.position).toBeNull();
  });

  it('returns 404 when scene belongs to different project', async () => {
    createProject(db, { id: 'p1', title: 'Script 1' });
    createProject(db, { id: 'p2', title: 'Script 2' });
    createScene(db, { id: 's1', projectId: 'p2', description: 'A scene' });
    const res = await app.request('/api/v1/projects/p1/scenes/s1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Changed' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for unknown fields (strict schema)', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createScene(db, { id: 's1', projectId: 'p1', description: 'A scene' });
    const res = await app.request('/api/v1/projects/p1/scenes/s1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weirdField: 'value' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/scenes/s1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'X' }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/projects/:id/scenes/:sceneId
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/projects/:id/scenes/:sceneId', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('deletes scene and returns 204', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createScene(db, { id: 's1', projectId: 'p1', description: 'A scene' });
    const res = await app.request('/api/v1/projects/p1/scenes/s1', { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('permanently removes the row', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createScene(db, { id: 's1', projectId: 'p1', description: 'A scene' });
    await app.request('/api/v1/projects/p1/scenes/s1', { method: 'DELETE' });
    const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get('s1');
    expect(row).toBeUndefined();
  });

  it('returns 404 for non-existent scene', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/scenes/ghost', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/scenes/s1', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
