import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';
import {
  listScenes,
  createScene,
  getScene,
  updateScene,
  deleteScene,
} from './scene-repository.js';
import { createIdea } from './idea-repository.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

function seedProject(db: Database.Database, id = 'proj-1'): void {
  const ts = new Date().toISOString();
  db.prepare(
    `INSERT INTO projects (id, title, status, created_at, updated_at) VALUES (?, 'P', 'DEVELOPING', ?, ?)`,
  ).run(id, ts, ts);
}

const BASE_SCENE = { projectId: 'proj-1', description: 'INT. OFFICE — DAY. The door opens.' };

// ---------------------------------------------------------------------------
// createScene / getScene
// ---------------------------------------------------------------------------

describe('createScene + getScene', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  it('creates a scene with defaults (no position, no dialogue, no sourceIdeaId)', () => {
    const s = createScene(db, { id: 's1', ...BASE_SCENE });
    expect(s.id).toBe('s1');
    expect(s.projectId).toBe('proj-1');
    expect(s.position).toBeNull();
    expect(s.dialogueSnippet).toBeNull();
    expect(s.sourceIdeaId).toBeNull();
  });

  it('creates a scene with all fields', () => {
    const s = createScene(db, {
      id: 's1',
      ...BASE_SCENE,
      dialogueSnippet: '"Get out," he said.',
      position: 2,
    });
    expect(s.dialogueSnippet).toBe('"Get out," he said.');
    expect(s.position).toBe(2);
  });

  it('creates a scene with sourceIdeaId (promoted from WHAT_IF)', () => {
    createIdea(db, { id: 'idea-1', content: 'what if...' });
    const s = createScene(db, { id: 's1', ...BASE_SCENE, sourceIdeaId: 'idea-1' });
    expect(s.sourceIdeaId).toBe('idea-1');
  });

  it('getScene returns null for unknown ID', () => {
    expect(getScene(db, 'ghost')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listScenes — filtering and actCounts
// ---------------------------------------------------------------------------

describe('listScenes', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  function seed(id: string, position: 1 | 2 | 3 | null): void {
    createScene(db, { id, projectId: 'proj-1', description: `Scene ${id}`, position });
  }

  it('returns all scenes when no act filter is given', () => {
    seed('s1', 1); seed('s2', 2); seed('s3', null);
    const { data } = listScenes(db, 'proj-1');
    expect(data).toHaveLength(3);
  });

  it('act filter 2 returns only Act 2 scenes', () => {
    seed('s1', 1); seed('s2', 2); seed('s3', 2); seed('s4', 3);
    const { data } = listScenes(db, 'proj-1', 2);
    expect(data).toHaveLength(2);
    expect(data.every((s) => s.position === 2)).toBe(true);
  });

  it('act filter "unplaced" returns only scenes with position IS NULL', () => {
    seed('s1', 1); seed('s2', null); seed('s3', null);
    const { data } = listScenes(db, 'proj-1', 'unplaced');
    expect(data).toHaveLength(2);
    expect(data.every((s) => s.position === null)).toBe(true);
  });

  it('actCounts is always returned regardless of act filter', () => {
    seed('s1', 1); seed('s2', 2); seed('s3', 2); seed('s4', null);
    const { meta } = listScenes(db, 'proj-1', 1); // filter to act 1 only
    expect(meta.actCounts[1]).toBe(1);
    expect(meta.actCounts[2]).toBe(2);
    expect(meta.actCounts[3]).toBe(0);
    expect(meta.actCounts.unplaced).toBe(1);
    expect(meta.actCounts.total).toBe(4);
  });

  it('actCounts.total equals sum of all act buckets', () => {
    seed('s1', 1); seed('s2', 2); seed('s3', 3); seed('s4', null); seed('s5', null);
    const { meta } = listScenes(db, 'proj-1');
    const { actCounts } = meta;
    expect(actCounts.total).toBe(
      actCounts[1] + actCounts[2] + actCounts[3] + actCounts.unplaced,
    );
  });

  it('returns empty data and zero counts for a project with no scenes', () => {
    const { data, meta } = listScenes(db, 'proj-1');
    expect(data).toHaveLength(0);
    expect(meta.actCounts.total).toBe(0);
  });

  it('does not return scenes from another project', () => {
    seedProject(db, 'proj-2');
    seed('s1', 1);
    createScene(db, { id: 's2', projectId: 'proj-2', description: 'Other project' });
    expect(listScenes(db, 'proj-1').data).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateScene
// ---------------------------------------------------------------------------

describe('updateScene', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  it('updates individual fields', () => {
    createScene(db, { id: 's1', ...BASE_SCENE, position: 1 });
    const updated = updateScene(db, 's1', { description: 'EXT. BEACH — SUNSET.' });
    expect(updated!.description).toBe('EXT. BEACH — SUNSET.');
    expect(updated!.position).toBe(1); // unchanged
  });

  it('sets position: null to unplace a scene', () => {
    createScene(db, { id: 's1', ...BASE_SCENE, position: 2 });
    const updated = updateScene(db, 's1', { position: null });
    expect(updated!.position).toBeNull();
  });

  it('sets dialogueSnippet: null to clear it', () => {
    createScene(db, { id: 's1', ...BASE_SCENE, dialogueSnippet: '"Hello."' });
    const updated = updateScene(db, 's1', { dialogueSnippet: null });
    expect(updated!.dialogueSnippet).toBeNull();
  });

  it('returns null for unknown ID', () => {
    expect(updateScene(db, 'ghost', { description: 'X' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteScene
// ---------------------------------------------------------------------------

describe('deleteScene', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  it('permanently removes the scene row', () => {
    createScene(db, { id: 's1', ...BASE_SCENE });
    const changes = deleteScene(db, 's1');
    expect(changes).toBe(1);
    expect(getScene(db, 's1')).toBeNull();
  });

  it('returns 0 changes for a non-existent scene', () => {
    expect(deleteScene(db, 'ghost')).toBe(0);
  });

  it('deleted scene does not appear in listScenes', () => {
    createScene(db, { id: 's1', ...BASE_SCENE });
    deleteScene(db, 's1');
    expect(listScenes(db, 'proj-1').data).toHaveLength(0);
  });
});
