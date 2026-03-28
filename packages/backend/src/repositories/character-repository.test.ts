import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from '../db/schema.js';
import {
  listCharacters,
  createCharacter,
  getCharacter,
  updateCharacter,
  deleteCharacter,
} from './character-repository.js';

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

const BASE = { name: 'Alice', obsession: 'revenge', occupation: 'detective' };

// ---------------------------------------------------------------------------
// createCharacter / getCharacter
// ---------------------------------------------------------------------------

describe('createCharacter + getCharacter', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  it('creates a character and returns it', () => {
    const c = createCharacter(db, { id: 'c1', projectId: 'proj-1', ...BASE });
    expect(c.id).toBe('c1');
    expect(c.projectId).toBe('proj-1');
    expect(c.name).toBe('Alice');
    expect(c.obsession).toBe('revenge');
    expect(c.occupation).toBe('detective');
    expect(c.notes).toBeNull();
  });

  it('creates a character with notes', () => {
    const c = createCharacter(db, { id: 'c2', projectId: 'proj-1', ...BASE, notes: 'A loner.' });
    expect(c.notes).toBe('A loner.');
  });

  it('getCharacter returns null for unknown ID', () => {
    expect(getCharacter(db, 'ghost')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// listCharacters
// ---------------------------------------------------------------------------

describe('listCharacters', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  it('returns all characters for a project sorted by createdAt', async () => {
    createCharacter(db, { id: 'c1', projectId: 'proj-1', ...BASE });
    await new Promise((r) => setTimeout(r, 5));
    createCharacter(db, { id: 'c2', projectId: 'proj-1', name: 'Bob', obsession: 'power', occupation: 'senator' });
    const chars = listCharacters(db, 'proj-1');
    expect(chars).toHaveLength(2);
    expect(chars[0].id).toBe('c1'); // oldest first
    expect(chars[1].id).toBe('c2');
  });

  it('returns empty array when no characters exist', () => {
    expect(listCharacters(db, 'proj-1')).toEqual([]);
  });

  it('does not return characters from another project', () => {
    seedProject(db, 'proj-2');
    createCharacter(db, { id: 'c1', projectId: 'proj-1', ...BASE });
    createCharacter(db, { id: 'c2', projectId: 'proj-2', ...BASE });
    expect(listCharacters(db, 'proj-1')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// updateCharacter
// ---------------------------------------------------------------------------

describe('updateCharacter', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  it('updates individual fields', () => {
    createCharacter(db, { id: 'c1', projectId: 'proj-1', ...BASE });
    const updated = updateCharacter(db, 'c1', { name: 'Alicia', obsession: 'justice' });
    expect(updated!.name).toBe('Alicia');
    expect(updated!.obsession).toBe('justice');
    expect(updated!.occupation).toBe('detective'); // unchanged
  });

  it('sets notes: null to clear it', () => {
    createCharacter(db, { id: 'c1', projectId: 'proj-1', ...BASE, notes: 'Some notes' });
    const updated = updateCharacter(db, 'c1', { notes: null });
    expect(updated!.notes).toBeNull();
  });

  it('returns null for unknown ID', () => {
    expect(updateCharacter(db, 'ghost', { name: 'X' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteCharacter
// ---------------------------------------------------------------------------

describe('deleteCharacter', () => {
  let db: Database.Database;
  beforeEach(() => { db = makeDb(); seedProject(db); });

  it('permanently removes the character row', () => {
    createCharacter(db, { id: 'c1', projectId: 'proj-1', ...BASE });
    const changes = deleteCharacter(db, 'c1');
    expect(changes).toBe(1);
    expect(getCharacter(db, 'c1')).toBeNull();
  });

  it('returns 0 changes for a non-existent character', () => {
    expect(deleteCharacter(db, 'ghost')).toBe(0);
  });

  it('deleted character does not appear in listCharacters', () => {
    createCharacter(db, { id: 'c1', projectId: 'proj-1', ...BASE });
    deleteCharacter(db, 'c1');
    expect(listCharacters(db, 'proj-1')).toHaveLength(0);
  });
});
