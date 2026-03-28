import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';
import { createProject } from '../repositories/project-repository.js';
import { createCharacter } from '../repositories/character-repository.js';
import type { AppEnv } from '../app.js';
import { registerCharacterRoutes } from './characters.js';

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
  registerCharacterRoutes(app);
  return { app, db };
}

// ---------------------------------------------------------------------------
// GET /api/v1/projects/:id/characters
// ---------------------------------------------------------------------------

describe('GET /api/v1/projects/:id/characters', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('returns empty array when no characters exist', async () => {
    createProject(db, { id: 'p1', title: 'My Script' });
    const res = await app.request('/api/v1/projects/p1/characters');
    expect(res.status).toBe(200);
    const body = await res.json() as { data: unknown[] };
    expect(body.data).toEqual([]);
  });

  it('returns characters sorted by createdAt ASC', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createCharacter(db, { id: 'c1', projectId: 'p1', name: 'Alice', obsession: 'Revenge', occupation: 'Detective' });
    createCharacter(db, { id: 'c2', projectId: 'p1', name: 'Bob', obsession: 'Power', occupation: 'Senator' });
    const res = await app.request('/api/v1/projects/p1/characters');
    const body = await res.json() as { data: { id: string }[] };
    expect(body.data[0].id).toBe('c1');
    expect(body.data[1].id).toBe('c2');
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/characters');
    expect(res.status).toBe(404);
    const body = await res.json() as { error: string };
    expect(body.error).toBe('NOT_FOUND');
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/projects/:id/characters
// ---------------------------------------------------------------------------

describe('POST /api/v1/projects/:id/characters', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('creates a character and returns 201', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Eve', obsession: 'Truth', occupation: 'Reporter' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { data: { name: string; projectId: string } };
    expect(body.data.name).toBe('Eve');
    expect(body.data.projectId).toBe('p1');
  });

  it('returns 400 when name is empty', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', obsession: 'x', occupation: 'y' }),
    });
    expect(res.status).toBe(400);
    const body = await res.json() as { error: string; fields: Record<string, string> };
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.fields.name).toBeDefined();
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X', obsession: 'y', occupation: 'z' }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/projects/:id/characters/:charId
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/projects/:id/characters/:charId', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('updates character fields', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createCharacter(db, { id: 'c1', projectId: 'p1', name: 'Alice', obsession: 'Old', occupation: 'Actor' });
    const res = await app.request('/api/v1/projects/p1/characters/c1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ obsession: 'New obsession' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { data: { obsession: string } };
    expect(body.data.obsession).toBe('New obsession');
  });

  it('returns 404 when character belongs to a different project', async () => {
    createProject(db, { id: 'p1', title: 'Script 1' });
    createProject(db, { id: 'p2', title: 'Script 2' });
    createCharacter(db, { id: 'c1', projectId: 'p2', name: 'Alice', obsession: 'x', occupation: 'y' });
    const res = await app.request('/api/v1/projects/p1/characters/c1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bob' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for unknown fields (strict schema)', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createCharacter(db, { id: 'c1', projectId: 'p1', name: 'Alice', obsession: 'x', occupation: 'y' });
    const res = await app.request('/api/v1/projects/p1/characters/c1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weirdField: 'value' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/characters/c1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/projects/:id/characters/:charId
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/projects/:id/characters/:charId', () => {
  let app: Hono<AppEnv>;
  let db: Database.Database;
  beforeEach(() => ({ app, db } = makeTestApp()));

  it('deletes character and returns 204', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createCharacter(db, { id: 'c1', projectId: 'p1', name: 'Alice', obsession: 'x', occupation: 'y' });
    const res = await app.request('/api/v1/projects/p1/characters/c1', { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('permanently removes the row', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    createCharacter(db, { id: 'c1', projectId: 'p1', name: 'Alice', obsession: 'x', occupation: 'y' });
    await app.request('/api/v1/projects/p1/characters/c1', { method: 'DELETE' });
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get('c1');
    expect(row).toBeUndefined();
  });

  it('returns 404 for non-existent character', async () => {
    createProject(db, { id: 'p1', title: 'Script' });
    const res = await app.request('/api/v1/projects/p1/characters/ghost', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent project', async () => {
    const res = await app.request('/api/v1/projects/ghost/characters/c1', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
