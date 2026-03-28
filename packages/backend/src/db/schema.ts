import type Database from 'better-sqlite3';

/**
 * Initialises a brand-new SQLite database with the screenplay-idea-vault schema.
 *
 * Called exactly once via the `onCreate` callback passed to `S3SQLiteDB.open()`
 * when no existing S3 object is found for the user.
 */
export function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      logline    TEXT,
      status     TEXT NOT NULL DEFAULT 'DEVELOPING'
                 CHECK (status IN ('DEVELOPING','ACTIVE','SHELVED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ideas (
      id          TEXT PRIMARY KEY,
      type        TEXT,
      content     TEXT NOT NULL,
      project_id  TEXT REFERENCES projects(id) ON DELETE SET NULL,
      excitement  INTEGER CHECK (excitement IN (1,2,3)),
      archived_at TEXT,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      reviewed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS tags (
      idea_id  TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
      tag      TEXT NOT NULL,
      PRIMARY KEY (idea_id, tag)
    );

    CREATE TABLE IF NOT EXISTS characters (
      id         TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      obsession  TEXT NOT NULL,
      occupation TEXT NOT NULL,
      notes      TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scenes (
      id               TEXT PRIMARY KEY,
      project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      description      TEXT NOT NULL,
      dialogue_snippet TEXT,
      position         INTEGER,
      source_idea_id   TEXT REFERENCES ideas(id) ON DELETE SET NULL,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ideas_project  ON ideas(project_id);
    CREATE INDEX IF NOT EXISTS idx_ideas_type     ON ideas(type);
    CREATE INDEX IF NOT EXISTS idx_ideas_archived ON ideas(archived_at);
    CREATE INDEX IF NOT EXISTS idx_scenes_project ON scenes(project_id);
    CREATE INDEX IF NOT EXISTS idx_chars_project  ON characters(project_id);
  `);
}
