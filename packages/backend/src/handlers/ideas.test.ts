import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { initSchema } from '../db/schema.js';
import { createProject } from '../repositories/project-repository.js';
import { createIdea, getIdea } from '../repositories/idea-repository.js';
import type { AppEnv } from '../app.js';
import { registerIdeaRoutes } from './ideas.js';

// ---------------------------------------------------------------------------
// Test app factory — bypasses auth and S3, uses in-memory SQLite
// ---------------------------------------------------------------------------

function makeTestApp(userId = 'test-user'): { app: Hono<AppEnv>; db: Database.Database } {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);

  const app = new Hono<AppEnv>();

  // Inject userId and db into context (bypasses real auth + S3SQLiteDB)
  app.use('*', async (c, next) => {
    c.set('userId', userId);
    c.set('db', db);
    await next();
  });

  registerIdeaRoutes(app);
  return { app, db };
}

// ---------------------------------------------------------------------------
// GET /api/v1/ideas
// ---------------------------------------------------------------------------

describe('GET /api/v1/ideas', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;

  beforeEach(() => ({ app, db } = makeTestApp()));

  it('returns { data, meta } with empty data when no ideas exist', async () => {
    const res = await app.request('/api/v1/ideas');
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[]; meta: { total: number; staleCutoffDays: number } };
    expect(body.data).toEqual([]);
    expect(body.meta.total).toBe(0);
    expect(body.meta.staleCutoffDays).toBe(14);
  });

  it('returns all non-archived ideas by default', async () => {
    createIdea(db, { id: uuid(), content: 'active idea' });
    const archivedId = uuid();
    createIdea(db, { id: archivedId, content: 'archived idea' });
    db.prepare(`UPDATE ideas SET archived_at = '2026-01-01T00:00:00.000Z' WHERE id = ?`).run(archivedId);

    const res = await app.request('/api/v1/ideas');
    const body = await res.json() as { data: { id: string }[] };
    expect(body.data).toHaveLength(1);
  });

  it('typeCounts and projectCounts present in meta', async () => {
    createIdea(db, { id: uuid(), content: 'what if', type: 'WHAT_IF' });
    createIdea(db, { id: uuid(), content: 'untyped' });
    const res = await app.request('/api/v1/ideas');
    const body = await res.json() as { meta: { typeCounts: Record<string, number>; projectCounts: Record<string, number> } };
    expect(body.meta.typeCounts.WHAT_IF).toBe(1);
    expect(body.meta.typeCounts.UNTYPED).toBe(1);
    expect(body.meta.projectCounts).toBeDefined();
  });

  it('filters by type', async () => {
    createIdea(db, { id: uuid(), content: 'what if', type: 'WHAT_IF' });
    createIdea(db, { id: uuid(), content: 'character', type: 'CHARACTER' });
    const res = await app.request('/api/v1/ideas?type=WHAT_IF');
    const body = await res.json() as { data: { type: string }[] };
    expect(body.data).toHaveLength(1);
    expect(body.data[0].type).toBe('WHAT_IF');
  });

  it('returns 400 for invalid type query param', async () => {
    const res = await app.request('/api/v1/ideas?type=BANANA');
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('VALIDATION_ERROR');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/ideas
// ---------------------------------------------------------------------------

describe('POST /api/v1/ideas', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;

  beforeEach(() => ({ app, db } = makeTestApp()));

  it('creates an idea and returns 201', async () => {
    const res = await app.request('/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'A whale walks into a bar', type: 'WHAT_IF' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { content: string; type: string } };
    expect(body.data.content).toBe('A whale walks into a bar');
    expect(body.data.type).toBe('WHAT_IF');
  });

  it('creates a raw/untyped idea when type is omitted', async () => {
    const res = await app.request('/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'No type here' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { type: null } };
    expect(body.data.type).toBeNull();
  });

  it('returns 400 when content is empty', async () => {
    const res = await app.request('/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; fields: Record<string, string> };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields.content).toBeDefined();
  });

  it('returns 400 when content exceeds 2000 chars', async () => {
    const res = await app.request('/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'x'.repeat(2001) }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid type value', async () => {
    const res = await app.request('/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'ok', type: 'INVALID' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 when projectId does not exist', async () => {
    const res = await app.request('/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'idea', projectId: 'ghost-project' }),
    });
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string; message: string };
    expect(body.error).toBe('NOT_FOUND');
    expect(body.message).toContain('Project not found');
  });

  it('assigns to a valid project', async () => {
    createProject(db, { id: 'proj-1', title: 'My Script' });
    const res = await app.request('/api/v1/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'idea for project', projectId: 'proj-1' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { projectId: string } };
    expect(body.data.projectId).toBe('proj-1');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/ideas/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/ideas/:id', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;

  beforeEach(() => ({ app, db } = makeTestApp()));

  it('returns the idea', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'hello', tags: ['a', 'b'] });
    const res = await app.request(`/api/v1/ideas/${id}`);
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { id: string; tags: string[] } };
    expect(body.data.id).toBe(id);
    expect(body.data.tags).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('returns 404 for non-existent ID (not 403)', async () => {
    const res = await app.request('/api/v1/ideas/does-not-exist');
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/ideas/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/ideas/:id', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;

  beforeEach(() => ({ app, db } = makeTestApp()));

  it('updates fields and returns updated idea', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'original', type: 'WHAT_IF' });
    const res = await app.request(`/api/v1/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'revised' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { content: string } };
    expect(body.data.content).toBe('revised');
  });

  it('auto-sets lastReviewedAt when content is patched without explicit lastReviewedAt', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'original' });
    const res = await app.request(`/api/v1/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'updated' }),
    });
    const body = await res.json() as { data: { lastReviewedAt: string | null } };
    expect(body.data.lastReviewedAt).not.toBeNull();
  });

  it('auto-sets lastReviewedAt when excitement is patched', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'idea' });
    const res = await app.request(`/api/v1/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ excitement: 3 }),
    });
    const body = await res.json() as { data: { lastReviewedAt: string | null } };
    expect(body.data.lastReviewedAt).not.toBeNull();
  });

  it('does NOT auto-set lastReviewedAt when explicit lastReviewedAt is provided', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'idea' });
    const explicitTs = '2025-01-01T00:00:00.000Z';
    const res = await app.request(`/api/v1/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'updated', lastReviewedAt: explicitTs }),
    });
    const body = await res.json() as { data: { lastReviewedAt: string } };
    expect(body.data.lastReviewedAt).toBe(explicitTs);
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await app.request('/api/v1/ideas/ghost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'updated' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for unknown fields (strict schema)', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'idea' });
    const res = await app.request(`/api/v1/ideas/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unknownField: 'value' }),
    });
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/ideas/:id (soft-archive)
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/ideas/:id', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;

  beforeEach(() => ({ app, db } = makeTestApp()));

  it('sets archivedAt and returns the idea', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'to archive' });
    const res = await app.request(`/api/v1/ideas/${id}`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { archivedAt: string | null } };
    expect(body.data.archivedAt).not.toBeNull();
  });

  it('does NOT delete the row (soft-archive)', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'idea' });
    await app.request(`/api/v1/ideas/${id}`, { method: 'DELETE' });
    expect(getIdea(db, id)).not.toBeNull();
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await app.request('/api/v1/ideas/ghost', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/ideas/:id/restore
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/ideas/:id/restore', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;

  beforeEach(() => ({ app, db } = makeTestApp()));

  it('clears archivedAt', async () => {
    const id = uuid();
    createIdea(db, { id, content: 'idea' });
    db.prepare(`UPDATE ideas SET archived_at = '2026-01-01T00:00:00.000Z' WHERE id = ?`).run(id);

    const res = await app.request(`/api/v1/ideas/${id}/restore`, { method: 'PATCH' });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { archivedAt: null } };
    expect(body.data.archivedAt).toBeNull();
  });

  it('returns 404 for non-existent ID', async () => {
    const res = await app.request('/api/v1/ideas/ghost/restore', { method: 'PATCH' });
    expect(res.status).toBe(404);
  });
});
