import type Database from 'better-sqlite3';
import type { Character } from 'shared';

// ---------------------------------------------------------------------------
// Internal row shape
// ---------------------------------------------------------------------------

interface CharacterRow {
  id: string;
  project_id: string;
  name: string;
  obsession: string;
  occupation: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    obsession: row.obsession,
    occupation: row.occupation,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * List all characters for a project, sorted by createdAt ascending.
 */
export function listCharacters(db: Database.Database, projectId: string): Character[] {
  const rows = db
    .prepare(`SELECT * FROM characters WHERE project_id = ? ORDER BY created_at ASC`)
    .all(projectId) as CharacterRow[];
  return rows.map(rowToCharacter);
}

export interface CreateCharacterData {
  id: string;
  projectId: string;
  name: string;
  obsession: string;
  occupation: string;
  notes?: string | null;
}

/**
 * Insert a new character and return it.
 */
export function createCharacter(db: Database.Database, data: CreateCharacterData): Character {
  const ts = now();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO characters (id, project_id, name, obsession, occupation, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(data.id, data.projectId, data.name, data.obsession, data.occupation, data.notes ?? null, ts, ts);
  })();
  return getCharacter(db, data.id) as Character;
}

/**
 * Fetch a single character by ID. Returns null if not found.
 */
export function getCharacter(db: Database.Database, charId: string): Character | null {
  const row = db
    .prepare(`SELECT * FROM characters WHERE id = ?`)
    .get(charId) as CharacterRow | undefined;
  return row ? rowToCharacter(row) : null;
}

export interface UpdateCharacterData {
  name?: string;
  obsession?: string;
  occupation?: string;
  notes?: string | null;
  updatedAt?: string;
}

/**
 * Partial-update a character. Returns updated character or null.
 */
export function updateCharacter(
  db: Database.Database,
  charId: string,
  patch: UpdateCharacterData,
): Character | null {
  const ts = patch.updatedAt ?? now();
  const setClauses: string[] = ['updated_at = ?'];
  const setParams: unknown[] = [ts];

  if (patch.name !== undefined) { setClauses.push('name = ?'); setParams.push(patch.name); }
  if (patch.obsession !== undefined) { setClauses.push('obsession = ?'); setParams.push(patch.obsession); }
  if (patch.occupation !== undefined) { setClauses.push('occupation = ?'); setParams.push(patch.occupation); }
  if ('notes' in patch) { setClauses.push('notes = ?'); setParams.push(patch.notes ?? null); }

  db.transaction(() => {
    db.prepare(`UPDATE characters SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams, charId);
  })();

  return getCharacter(db, charId);
}

/**
 * Permanently delete a character. Returns the number of rows deleted.
 */
export function deleteCharacter(db: Database.Database, charId: string): number {
  const result = db.prepare(`DELETE FROM characters WHERE id = ?`).run(charId);
  return result.changes;
}
