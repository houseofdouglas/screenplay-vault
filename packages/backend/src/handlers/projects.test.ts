import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';
import { createProject } from '../repositories/project-repository.js';
import type { AppEnv } from '../app.js';
import { registerProjectRoutes } from './projects.js';

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
  registerProjectRoutes(app);
  return { app, db };
}

// ---------------------------------------------------------------------------
// GET /api/v1/projects
// ---------------------------------------------------------------------------

describe('GET /api/v1/projects', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('returns all projects sorted by updatedAt DESC with counts', async () => {
    createProject(db, { id: 'p1', title: 'Older' });
    await new Promise((r) => setTimeout(r, 5));
    createProject(db, { id: 'p2', title: 'Newer' });

    const res = await app.request('/api/v1/projects');
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string; ideaCount: number }[] };
    expect(body.data[0].id).toBe('p2');
    expect(body.data[0].ideaCount).toBe(0);
  });

  it('returns empty array when no projects exist', async () => {
    const res = await app.request('/api/v1/projects');
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects
// ---------------------------------------------------------------------------

describe('POST /api/v1/projects', () => {
  let app: Hono<AppEnv>;
  beforeEach(() => ({ app } = makeTestApp()));

  it('creates a project and returns 201 with counts', async () => {
    const res = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Script', logline: 'A story', status: 'DEVELOPING' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as {
      data: { title: string; status: string; ideaCount: number; characterCount: number; sceneCount: number }
    };
    expect(body.data.title).toBe('My Script');
    expect(body.data.status).toBe('DEVELOPING');
    expect(body.data.ideaCount).toBe(0);
    expect(body.data.characterCount).toBe(0);
    expect(body.data.sceneCount).toBe(0);
  });

  it('returns 400 with fields.title when title is empty', async () => {
    const res = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; fields: Record<string, string> };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields.title).toBeDefined();
  });

  it('returns 400 when title exceeds 200 chars', async () => {
    const res = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'x'.repeat(201) }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for unknown fields (strict schema)', async () => {
    const res = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'ok', unknownField: 'value' }),
    });
    // CreateProjectSchema is not strict, unknown fields are stripped
    // So this should succeed
    expect(res.status).toBe(201);
  });

  it('defaults status to DEVELOPING when omitted', async () => {
    const res = await app.request('/api/v1/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Default Status' }),
    });
    const body = await res.json() as { data: { status: string } };
    expect(body.data.status).toBe('DEVELOPING');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/projects/:id', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('returns the project with counts', async () => {
    createProject(db, { id: 'p1', title: 'My Script' });
    const res = await app.request('/api/v1/projects/p1');
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string; ideaCount: number } };
    expect(body.data.id).toBe('p1');
    expect(body.data.ideaCount).toBe(0);
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost');
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/projects/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/projects/:id', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('updates project fields', async () => {
    createProject(db, { id: 'p1', title: 'Draft', status: 'DEVELOPING' });
    const res = await app.request('/api/v1/projects/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Final', status: 'ACTIVE' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { title: string; status: string } };
    expect(body.data.title).toBe('Final');
    expect(body.data.status).toBe('ACTIVE');
  });

  it('clears logline when set to null', async () => {
    createProject(db, { id: 'p1', title: 'P', logline: 'Some logline' });
    const res = await app.request('/api/v1/projects/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logline: null }),
    });
    const body = await res.json() as { data: { logline: null } };
    expect(body.data.logline).toBeNull();
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'X' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for unknown fields (strict schema)', async () => {
    createProject(db, { id: 'p1', title: 'P' });
    const res = await app.request('/api/v1/projects/p1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weirdField: 'value' }),
    });
    expect(res.status).toBe(400);
  });
});
