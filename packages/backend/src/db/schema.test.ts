import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { initSchema } from './schema.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Open a fresh in-memory SQLite DB and apply the schema. */
function openDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  initSchema(db);
  return db;
}

type ColumnInfo = { name: string; type: string; notnull: number; dflt_value: string | null; pk: number };
type IndexInfo = { name: string; tbl_name: string };

function columns(db: Database.Database, table: string): ColumnInfo[] {
  return db.prepare(`PRAGMA table_info(${table})`).all() as ColumnInfo[];
}

function columnNames(db: Database.Database, table: string): string[] {
  return columns(db, table).map((c) => c.name);
}

function indexes(db: Database.Database): IndexInfo[] {
  return db
    .prepare(`SELECT name, tbl_name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'`)
    .all() as IndexInfo[];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('initSchema', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = openDb();
  });

  // -------------------------------------------------------------------------
  // Tables exist
  // -------------------------------------------------------------------------

  it('creates all 5 tables', () => {
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .all()
      .map((r) => (r as { name: string }).name)
      .sort();

    expect(tables).toEqual(['characters', 'ideas', 'projects', 'scenes', 'tags']);
  });

  it('is idempotent (IF NOT EXISTS — safe to call twice)', () => {
    expect(() => initSchema(db)).not.toThrow();
  });

  // -------------------------------------------------------------------------
  // ideas table
  // -------------------------------------------------------------------------

  describe('ideas table', () => {
    it('has the required columns', () => {
      const cols = columnNames(db, 'ideas');
      expect(cols).toEqual(expect.arrayContaining([
        'id', 'type', 'content', 'project_id', 'excitement',
        'archived_at', 'created_at', 'updated_at', 'reviewed_at',
      ]));
    });

    it('has updated_at column', () => {
      expect(columnNames(db, 'ideas')).toContain('updated_at');
    });

    it('enforces excitement CHECK constraint', () => {
      db.exec(`INSERT INTO projects (id, title, status, created_at, updated_at)
               VALUES ('p1', 'Test', 'DEVELOPING', 'now', 'now')`);
      db.exec(`INSERT INTO ideas (id, content, created_at, updated_at, excitement)
               VALUES ('i1', 'idea', 'now', 'now', 2)`);

      expect(() => {
        db.exec(`INSERT INTO ideas (id, content, created_at, updated_at, excitement)
                 VALUES ('i2', 'idea', 'now', 'now', 99)`);
      }).toThrow();
    });

    it('allows type to be NULL', () => {
      expect(() => {
        db.exec(`INSERT INTO ideas (id, content, created_at, updated_at)
                 VALUES ('i3', 'no type', 'now', 'now')`);
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // projects table
  // -------------------------------------------------------------------------

  describe('projects table', () => {
    it('has the required columns', () => {
      const cols = columnNames(db, 'projects');
      expect(cols).toEqual(expect.arrayContaining([
        'id', 'title', 'logline', 'status', 'created_at', 'updated_at',
      ]));
    });

    it('has updated_at column', () => {
      expect(columnNames(db, 'projects')).toContain('updated_at');
    });

    it('enforces status CHECK constraint', () => {
      expect(() => {
        db.exec(`INSERT INTO projects (id, title, status, created_at, updated_at)
                 VALUES ('p2', 'Test', 'INVALID', 'now', 'now')`);
      }).toThrow();
    });

    it('accepts valid status values', () => {
      for (const [idx, status] of ['DEVELOPING', 'ACTIVE', 'SHELVED'].entries()) {
        expect(() => {
          db.exec(`INSERT INTO projects (id, title, status, created_at, updated_at)
                   VALUES ('p${idx + 10}', 'Test', '${status}', 'now', 'now')`);
        }).not.toThrow();
      }
    });
  });

  // -------------------------------------------------------------------------
  // tags table
  // -------------------------------------------------------------------------

  describe('tags table', () => {
    it('has the required columns', () => {
      expect(columnNames(db, 'tags')).toEqual(expect.arrayContaining(['idea_id', 'tag']));
    });

    it('cascades DELETE from ideas', () => {
      db.exec(`INSERT INTO ideas (id, content, created_at, updated_at) VALUES ('idea1', 'x', 'now', 'now')`);
      db.exec(`INSERT INTO tags (idea_id, tag) VALUES ('idea1', 'mytag')`);
      db.exec(`DELETE FROM ideas WHERE id = 'idea1'`);
      const rows = db.prepare(`SELECT * FROM tags WHERE idea_id = 'idea1'`).all();
      expect(rows).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // characters table
  // -------------------------------------------------------------------------

  describe('characters table', () => {
    it('has the required columns including updated_at', () => {
      const cols = columnNames(db, 'characters');
      expect(cols).toEqual(expect.arrayContaining([
        'id', 'project_id', 'name', 'obsession', 'occupation', 'notes', 'created_at', 'updated_at',
      ]));
    });

    it('cascades DELETE from projects', () => {
      db.exec(`INSERT INTO projects (id, title, status, created_at, updated_at) VALUES ('proj1', 'P', 'DEVELOPING', 'now', 'now')`);
      db.exec(`INSERT INTO characters (id, project_id, name, obsession, occupation, created_at, updated_at)
               VALUES ('c1', 'proj1', 'Alice', 'revenge', 'detective', 'now', 'now')`);
      db.exec(`DELETE FROM projects WHERE id = 'proj1'`);
      const rows = db.prepare(`SELECT * FROM characters WHERE id = 'c1'`).all();
      expect(rows).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // scenes table
  // -------------------------------------------------------------------------

  describe('scenes table', () => {
    it('has the required columns including updated_at and source_idea_id', () => {
      const cols = columnNames(db, 'scenes');
      expect(cols).toEqual(expect.arrayContaining([
        'id', 'project_id', 'description', 'dialogue_snippet',
        'position', 'source_idea_id', 'created_at', 'updated_at',
      ]));
    });

    it('has source_idea_id column', () => {
      expect(columnNames(db, 'scenes')).toContain('source_idea_id');
    });

    it('cascades DELETE from projects', () => {
      db.exec(`INSERT INTO projects (id, title, status, created_at, updated_at) VALUES ('proj2', 'P', 'DEVELOPING', 'now', 'now')`);
      db.exec(`INSERT INTO scenes (id, project_id, description, created_at, updated_at)
               VALUES ('s1', 'proj2', 'EXT. BEACH', 'now', 'now')`);
      db.exec(`DELETE FROM projects WHERE id = 'proj2'`);
      const rows = db.prepare(`SELECT * FROM scenes WHERE id = 's1'`).all();
      expect(rows).toHaveLength(0);
    });

    it('sets source_idea_id to NULL on DELETE of referenced idea (ON DELETE SET NULL)', () => {
      db.exec(`INSERT INTO projects (id, title, status, created_at, updated_at) VALUES ('proj3', 'P', 'DEVELOPING', 'now', 'now')`);
      db.exec(`INSERT INTO ideas (id, content, created_at, updated_at) VALUES ('src1', 'what if', 'now', 'now')`);
      db.exec(`INSERT INTO scenes (id, project_id, description, source_idea_id, created_at, updated_at)
               VALUES ('s2', 'proj3', 'INT. ROOM', 'src1', 'now', 'now')`);
      db.exec(`DELETE FROM ideas WHERE id = 'src1'`);
      const row = db.prepare(`SELECT source_idea_id FROM scenes WHERE id = 's2'`).get() as { source_idea_id: string | null };
      expect(row.source_idea_id).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Indexes
  // -------------------------------------------------------------------------

  describe('indexes', () => {
    it('creates all 5 required indexes', () => {
      const idxNames = indexes(db).map((i) => i.name).sort();
      expect(idxNames).toEqual(expect.arrayContaining([
        'idx_chars_project',
        'idx_ideas_archived',
        'idx_ideas_project',
        'idx_ideas_type',
        'idx_scenes_project',
      ]));
    });

    it('idx_ideas_project is on the ideas table', () => {
      const idx = indexes(db).find((i) => i.name === 'idx_ideas_project');
      expect(idx?.tbl_name).toBe('ideas');
    });

    it('idx_scenes_project is on the scenes table', () => {
      const idx = indexes(db).find((i) => i.name === 'idx_scenes_project');
      expect(idx?.tbl_name).toBe('scenes');
    });

    it('idx_chars_project is on the characters table', () => {
      const idx = indexes(db).find((i) => i.name === 'idx_chars_project');
      expect(idx?.tbl_name).toBe('characters');
    });
  });

  // -------------------------------------------------------------------------
  // FK: ideas.project_id ON DELETE SET NULL
  // -------------------------------------------------------------------------

  it('sets ideas.project_id to NULL when project is deleted', () => {
    db.exec(`INSERT INTO projects (id, title, status, created_at, updated_at) VALUES ('pX', 'P', 'DEVELOPING', 'now', 'now')`);
    db.exec(`INSERT INTO ideas (id, content, project_id, created_at, updated_at) VALUES ('iX', 'idea', 'pX', 'now', 'now')`);
    db.exec(`DELETE FROM projects WHERE id = 'pX'`);
    const row = db.prepare(`SELECT project_id FROM ideas WHERE id = 'iX'`).get() as { project_id: string | null };
    expect(row.project_id).toBeNull();
  });
});
