import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
} from './project-repository.js';
import { createIdea, archiveIdea } from './idea-repository.js';
import { v4 as uuid } from 'uuid';

// ---------------------------------------------------------------------------
// Test DB factory
// ---------------------------------------------------------------------------

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function seedChar(db: Database.Database, projectId: string): void {
  const ts = new Date().toISOString();
  db.prepare(
    `INSERT INTO characters (id, project_id, name, obsession, occupation, created_at, updated_at)
     VALUES (?, ?, 'Alice', 'revenge', 'detective', ?, ?)`,
  ).run(uuid(), projectId, ts, ts);
}

function seedScene(db: Database.Database, projectId: string): void {
  const ts = new Date().toISOString();
  db.prepare(
    `INSERT INTO scenes (id, project_id, description, created_at, updated_at)
     VALUES (?, ?, 'EXT. BEACH', ?, ?)`,
  ).run(uuid(), projectId, ts, ts);
}

// ---------------------------------------------------------------------------
// createProject / getProject
// ---------------------------------------------------------------------------

describe('createProject + getProject', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); });

  it('creates a project with defaults and returns it', () => {
    const p = createProject(db, { id: 'p1', title: 'My Script' });
    expect(p.id).toBe('p1');
    expect(p.title).toBe('My Script');
    expect(p.status).toBe('DEVELOPING');
    expect(p.logline).toBeNull();
    expect(p.ideaCount).toBe(0);
    expect(p.characterCount).toBe(0);
    expect(p.sceneCount).toBe(0);
  });

  it('creates a project with all fields', () => {
    const p = createProject(db, {
      id: 'p2',
      title: 'Drama',
      logline: 'A story about revenge',
      status: 'ACTIVE',
    });
    expect(p.logline).toBe('A story about revenge');
    expect(p.status).toBe('ACTIVE');
  });

  it('getProject returns null for a non-existent ID', () => {
    expect(getProject(db, 'does-not-exist')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listProjects — counts and ordering
// ---------------------------------------------------------------------------

describe('listProjects', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); });

  it('returns projects sorted by updatedAt DESC', async () => {
    createProject(db, { id: 'p1', title: 'Older' });
    // Small delay to ensure different timestamps
    await new Promise((r) => setTimeout(r, 5));
    createProject(db, { id: 'p2', title: 'Newer' });
    const projects = listProjects(db);
    expect(projects[0].id).toBe('p2');
    expect(projects[1].id).toBe('p1');
  });

  it('includes ideaCount for non-archived ideas', () => {
    createProject(db, { id: 'p1', title: 'P' });
    createIdea(db, { id: uuid(), content: 'idea 1', projectId: 'p1' });
    createIdea(db, { id: uuid(), content: 'idea 2', projectId: 'p1' });
    const [p] = listProjects(db);
    expect(p.ideaCount).toBe(2);
  });

  it('does not count archived ideas in ideaCount', () => {
    createProject(db, { id: 'p1', title: 'P' });
    const id = uuid();
    createIdea(db, { id, content: 'idea', projectId: 'p1' });
    archiveIdea(db, id);
    const [p] = listProjects(db);
    expect(p.ideaCount).toBe(0);
  });

  it('includes characterCount', () => {
    createProject(db, { id: 'p1', title: 'P' });
    seedChar(db, 'p1');
    seedChar(db, 'p1');
    const [p] = listProjects(db);
    expect(p.characterCount).toBe(2);
  });

  it('includes sceneCount', () => {
    createProject(db, { id: 'p1', title: 'P' });
    seedScene(db, 'p1');
    const [p] = listProjects(db);
    expect(p.sceneCount).toBe(1);
  });

  it('returns empty array when no projects exist', () => {
    expect(listProjects(db)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// updateProject
// ---------------------------------------------------------------------------

describe('updateProject', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); });

  it('updates individual fields', () => {
    createProject(db, { id: 'p1', title: 'Draft', status: 'DEVELOPING' });
    const updated = updateProject(db, 'p1', { title: 'Final', status: 'ACTIVE' });
    expect(updated!.title).toBe('Final');
    expect(updated!.status).toBe('ACTIVE');
  });

  it('always sets updatedAt to a new timestamp', async () => {
    createProject(db, { id: 'p1', title: 'P' });
    const before = getProject(db, 'p1')!.updatedAt;
    await new Promise((r) => setTimeout(r, 5));
    updateProject(db, 'p1', { title: 'Changed' });
    const after = getProject(db, 'p1')!.updatedAt;
    expect(after > before).toBe(true);
  });

  it('sets logline: null to clear it', () => {
    createProject(db, { id: 'p1', title: 'P', logline: 'Some logline' });
    const updated = updateProject(db, 'p1', { logline: null });
    expect(updated!.logline).toBeNull();
  });

  it('returns null for a non-existent project', () => {
    const result = updateProject(db, 'ghost', { title: 'X' });
    expect(result).toBeNull();
  });
});
