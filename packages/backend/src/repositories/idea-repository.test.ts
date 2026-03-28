import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';
import {
  listIdeas,
  createIdea,
  getIdea,
  updateIdea,
  archiveIdea,
  restoreIdea,
} from './idea-repository.js';

// ---------------------------------------------------------------------------
// Test DB factory
// ---------------------------------------------------------------------------

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

let idSeq = 0;
function nextId(): string {
  return `id-${++idSeq}`;
}

function seedProject(db: Database.Database, id = 'proj-1', title = 'Test Project'): string {
  const ts = new Date().toISOString();
  db.prepare(
    `INSERT INTO projects (id, title, status, created_at, updated_at) VALUES (?, ?, 'DEVELOPING', ?, ?)`,
  ).run(id, title, ts, ts);
  return id;
}

// ---------------------------------------------------------------------------
// createIdea / getIdea
// ---------------------------------------------------------------------------

describe('createIdea + getIdea', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); idSeq = 0; });

  it('creates an idea and returns it with tags', () => {
    const id = nextId();
    const idea = createIdea(db, {
      id,
      type: 'WHAT_IF',
      content: 'What if whales could vote?',
      tags: ['whales', 'politics'],
      excitement: 3,
    });
    expect(idea.id).toBe(id);
    expect(idea.type).toBe('WHAT_IF');
    expect(idea.content).toBe('What if whales could vote?');
    expect(idea.tags).toEqual(expect.arrayContaining(['whales', 'politics']));
    expect(idea.excitement).toBe(3);
    expect(idea.archivedAt).toBeNull();
  });

  it('creates an idea with type: null (raw/untyped)', () => {
    const idea = createIdea(db, { id: nextId(), content: 'raw', type: null });
    expect(idea.type).toBeNull();
  });

  it('creates an idea with no tags (default empty)', () => {
    const idea = createIdea(db, { id: nextId(), content: 'no tags' });
    expect(idea.tags).toEqual([]);
  });

  it('getIdea returns null for a non-existent ID', () => {
    expect(getIdea(db, 'does-not-exist')).toBeNull();
  });

  it('getIdea returns the idea with tags', () => {
    const id = nextId();
    createIdea(db, { id, content: 'hello', tags: ['a', 'b'] });
    const idea = getIdea(db, id);
    expect(idea).not.toBeNull();
    expect(idea!.tags).toEqual(expect.arrayContaining(['a', 'b']));
  });
});

// ---------------------------------------------------------------------------
// listIdeas — basic
// ---------------------------------------------------------------------------

describe('listIdeas', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); idSeq = 0; });

  it('returns all non-archived ideas by default (sorted createdAt DESC)', () => {
    const id1 = nextId(); const id2 = nextId(); const id3 = nextId();
    createIdea(db, { id: id1, content: 'first' });
    createIdea(db, { id: id2, content: 'second' });
    createIdea(db, { id: id3, content: 'third' });
    const { data } = listIdeas(db);
    expect(data).toHaveLength(3);
    // Should be sorted by created_at DESC — last created first
    expect(data[0].id).toBe(id3);
  });

  it('does not return archived ideas by default', () => {
    const id = nextId();
    createIdea(db, { id, content: 'to archive' });
    archiveIdea(db, id);
    const { data } = listIdeas(db);
    expect(data.find((i) => i.id === id)).toBeUndefined();
  });

  it('archived: true returns only archived ideas', () => {
    const id = nextId();
    createIdea(db, { id, content: 'archived' });
    archiveIdea(db, id);
    createIdea(db, { id: nextId(), content: 'active' });
    const { data } = listIdeas(db, { archived: true });
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe(id);
  });

  it('type filter returns only matching type', () => {
    createIdea(db, { id: nextId(), content: 'a', type: 'WHAT_IF' });
    createIdea(db, { id: nextId(), content: 'b', type: 'CHARACTER' });
    createIdea(db, { id: nextId(), content: 'c', type: 'WHAT_IF' });
    const { data } = listIdeas(db, { type: 'WHAT_IF' });
    expect(data).toHaveLength(2);
    expect(data.every((i) => i.type === 'WHAT_IF')).toBe(true);
  });

  it('projectId filter returns only matching project', () => {
    seedProject(db, 'proj-a');
    seedProject(db, 'proj-b');
    createIdea(db, { id: nextId(), content: 'a', projectId: 'proj-a' });
    createIdea(db, { id: nextId(), content: 'b', projectId: 'proj-b' });
    const { data } = listIdeas(db, { projectId: 'proj-a' });
    expect(data).toHaveLength(1);
    expect(data[0].projectId).toBe('proj-a');
  });

  it('projectId: "unassigned" returns only ideas with projectId IS NULL', () => {
    seedProject(db);
    createIdea(db, { id: nextId(), content: 'assigned', projectId: 'proj-1' });
    createIdea(db, { id: nextId(), content: 'unassigned' });
    const { data } = listIdeas(db, { projectId: 'unassigned' });
    expect(data).toHaveLength(1);
    expect(data[0].projectId).toBeNull();
  });

  it('q filter matches content (case-insensitive substring)', () => {
    createIdea(db, { id: nextId(), content: 'A linguist walks into a bar' });
    createIdea(db, { id: nextId(), content: 'Completely unrelated' });
    const { data } = listIdeas(db, { q: 'linguist' });
    expect(data).toHaveLength(1);
    expect(data[0].content).toContain('linguist');
  });

  it('q filter matches exact tag', () => {
    createIdea(db, { id: nextId(), content: 'no keyword here', tags: ['linguist'] });
    createIdea(db, { id: nextId(), content: 'nothing matching' });
    const { data } = listIdeas(db, { q: 'linguist' });
    expect(data).toHaveLength(1);
  });

  it('sort: type returns ideas sorted by type ASC', () => {
    createIdea(db, { id: nextId(), content: 'z', type: 'THEME' });
    createIdea(db, { id: nextId(), content: 'a', type: 'CHARACTER' });
    createIdea(db, { id: nextId(), content: 'm', type: 'NEWS_FLASH' });
    const { data } = listIdeas(db, { sort: 'type' });
    const types = data.map((i) => i.type).filter(Boolean);
    expect(types).toEqual([...types].sort());
  });

  it('sort: last_reviewed returns null lastReviewedAt first', () => {
    const id1 = nextId(); const id2 = nextId();
    createIdea(db, { id: id1, content: 'never reviewed' });
    createIdea(db, { id: id2, content: 'reviewed recently' });
    updateIdea(db, id2, { lastReviewedAt: new Date().toISOString() });
    const { data } = listIdeas(db, { sort: 'last_reviewed' });
    expect(data[0].id).toBe(id1); // null reviewed_at comes first
  });
});

// ---------------------------------------------------------------------------
// typeCounts
// ---------------------------------------------------------------------------

describe('typeCounts', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); idSeq = 0; });

  it('includes an UNTYPED key for ideas with type IS NULL', () => {
    createIdea(db, { id: nextId(), content: 'typed', type: 'WHAT_IF' });
    createIdea(db, { id: nextId(), content: 'untyped', type: null });
    const { meta } = listIdeas(db);
    expect(meta.typeCounts.UNTYPED).toBe(1);
    expect(meta.typeCounts.WHAT_IF).toBe(1);
  });

  it('all type keys default to 0', () => {
    const { meta } = listIdeas(db);
    expect(meta.typeCounts.CHARACTER).toBe(0);
    expect(meta.typeCounts.SCENE).toBe(0);
  });

  it('staleCutoffDays is always 14', () => {
    expect(listIdeas(db).meta.staleCutoffDays).toBe(14);
  });
});

// ---------------------------------------------------------------------------
// updateIdea
// ---------------------------------------------------------------------------

describe('updateIdea', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); idSeq = 0; });

  it('updates individual fields', () => {
    const id = nextId();
    createIdea(db, { id, content: 'original', type: 'WHAT_IF', excitement: 1 });
    const updated = updateIdea(db, id, { content: 'revised', excitement: 3 });
    expect(updated!.content).toBe('revised');
    expect(updated!.excitement).toBe(3);
    expect(updated!.type).toBe('WHAT_IF'); // unchanged
  });

  it('replaces tags wholesale', () => {
    const id = nextId();
    createIdea(db, { id, content: 'idea', tags: ['a', 'b'] });
    const updated = updateIdea(db, id, { tags: ['c', 'd'] });
    expect(updated!.tags).toEqual(expect.arrayContaining(['c', 'd']));
    expect(updated!.tags).not.toContain('a');
  });

  it('sets excitement: null to clear rating', () => {
    const id = nextId();
    createIdea(db, { id, content: 'idea', excitement: 2 });
    const updated = updateIdea(db, id, { excitement: null });
    expect(updated!.excitement).toBeNull();
  });

  it('sets projectId: null to unassign', () => {
    seedProject(db);
    const id = nextId();
    createIdea(db, { id, content: 'idea', projectId: 'proj-1' });
    const updated = updateIdea(db, id, { projectId: null });
    expect(updated!.projectId).toBeNull();
  });

  it('sets lastReviewedAt', () => {
    const id = nextId();
    createIdea(db, { id, content: 'idea' });
    const ts = new Date().toISOString();
    const updated = updateIdea(db, id, { lastReviewedAt: ts });
    expect(updated!.lastReviewedAt).toBe(ts);
  });
});

// ---------------------------------------------------------------------------
// archiveIdea / restoreIdea
// ---------------------------------------------------------------------------

describe('archiveIdea + restoreIdea', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); idSeq = 0; });

  it('archiveIdea sets archivedAt', () => {
    const id = nextId();
    createIdea(db, { id, content: 'active' });
    const archived = archiveIdea(db, id);
    expect(archived!.archivedAt).not.toBeNull();
  });

  it('archived idea is excluded from default list', () => {
    const id = nextId();
    createIdea(db, { id, content: 'active' });
    archiveIdea(db, id);
    expect(listIdeas(db).data.find((i) => i.id === id)).toBeUndefined();
  });

  it('restoreIdea clears archivedAt', () => {
    const id = nextId();
    createIdea(db, { id, content: 'idea' });
    archiveIdea(db, id);
    const restored = restoreIdea(db, id);
    expect(restored!.archivedAt).toBeNull();
  });

  it('restored idea appears in the default list', () => {
    const id = nextId();
    createIdea(db, { id, content: 'idea' });
    archiveIdea(db, id);
    restoreIdea(db, id);
    expect(listIdeas(db).data.find((i) => i.id === id)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// listIdeas — stale filter
// ---------------------------------------------------------------------------

describe('listIdeas — stale filter', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); idSeq = 0; });

  function insertStaleIdea(dbInst: Database.Database, id: string) {
    // Insert with created_at 20 days ago and no reviewed_at
    const staleTs = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    dbInst.prepare(
      `INSERT INTO ideas (id, content, created_at, updated_at) VALUES (?, 'stale idea', ?, ?)`
    ).run(id, staleTs, staleTs);
  }

  function insertFreshIdea(dbInst: Database.Database, id: string) {
    const now = new Date().toISOString();
    dbInst.prepare(
      `INSERT INTO ideas (id, content, created_at, updated_at) VALUES (?, 'fresh idea', ?, ?)`
    ).run(id, now, now);
  }

  it('stale=true returns only ideas not reviewed in >14 days', () => {
    insertStaleIdea(db, 'stale-1');
    insertFreshIdea(db, 'fresh-1');
    const { data } = listIdeas(db, { stale: true });
    expect(data.map((i) => i.id)).toContain('stale-1');
    expect(data.map((i) => i.id)).not.toContain('fresh-1');
  });

  it('stale filter includes ideas where reviewed_at is null and created_at >14 days ago', () => {
    insertStaleIdea(db, 'stale-2');
    const { data } = listIdeas(db, { stale: true });
    expect(data.find((i) => i.id === 'stale-2')).toBeDefined();
  });

  it('stale=false (default) returns all non-archived ideas regardless of age', () => {
    insertStaleIdea(db, 'stale-3');
    insertFreshIdea(db, 'fresh-2');
    const { data } = listIdeas(db, { stale: false });
    const ids = data.map((i) => i.id);
    expect(ids).toContain('stale-3');
    expect(ids).toContain('fresh-2');
  });
});
