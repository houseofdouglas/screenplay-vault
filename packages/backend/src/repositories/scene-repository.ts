import type Database from 'better-sqlite3';
import type { Scene, ActCounts } from 'shared';

// ---------------------------------------------------------------------------
// Internal row shape
// ---------------------------------------------------------------------------

interface SceneRow {
  id: string;
  project_id: string;
  description: string;
  dialogue_snippet: string | null;
  position: number | null;
  source_idea_id: string | null;
  created_at: string;
  updated_at: string;
}

interface ActCountRow {
  position: number | null;
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToScene(row: SceneRow): Scene {
  return {
    id: row.id,
    projectId: row.project_id,
    description: row.description,
    dialogueSnippet: row.dialogue_snippet,
    position: (row.position ?? null) as 1 | 2 | 3 | null,
    sourceIdeaId: row.source_idea_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildActCounts(rows: ActCountRow[], total: number): ActCounts {
  const counts: ActCounts = { 1: 0, 2: 0, 3: 0, unplaced: 0, total };
  for (const row of rows) {
    if (row.position === 1) counts[1] = row.count;
    else if (row.position === 2) counts[2] = row.count;
    else if (row.position === 3) counts[3] = row.count;
    else counts.unplaced = row.count;
  }
  return counts;
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// List options
// ---------------------------------------------------------------------------

export type ActFilter = 1 | 2 | 3 | 'unplaced';

export interface ListScenesResult {
  data: Scene[];
  meta: { actCounts: ActCounts };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * List scenes for a project, with optional act filter, plus actCounts aggregation.
 */
export function listScenes(
  db: Database.Database,
  projectId: string,
  act?: ActFilter,
): ListScenesResult {
  // Act counts always span all scenes for the project (regardless of filter).
  const countRows = db
    .prepare(
      `SELECT position, COUNT(*) AS count FROM scenes WHERE project_id = ? GROUP BY position`,
    )
    .all(projectId) as ActCountRow[];

  const total = countRows.reduce((sum, r) => sum + r.count, 0);
  const actCounts = buildActCounts(countRows, total);

  // Filtered data query.
  let sql: string;
  let params: unknown[];

  if (act === undefined) {
    sql = `SELECT * FROM scenes WHERE project_id = ? ORDER BY created_at DESC`;
    params = [projectId];
  } else if (act === 'unplaced') {
    sql = `SELECT * FROM scenes WHERE project_id = ? AND position IS NULL ORDER BY created_at DESC`;
    params = [projectId];
  } else {
    sql = `SELECT * FROM scenes WHERE project_id = ? AND position = ? ORDER BY created_at DESC`;
    params = [projectId, act];
  }

  const rows = db.prepare(sql).all(...params) as SceneRow[];

  return { data: rows.map(rowToScene), meta: { actCounts } };
}

export interface CreateSceneData {
  id: string;
  projectId: string;
  description: string;
  dialogueSnippet?: string | null;
  position?: 1 | 2 | 3 | null;
  sourceIdeaId?: string | null;
}

/**
 * Insert a new scene and return it.
 */
export function createScene(db: Database.Database, data: CreateSceneData): Scene {
  const ts = now();
  db.transaction(() => {
    db.prepare(
      `INSERT INTO scenes (id, project_id, description, dialogue_snippet, position, source_idea_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      data.id,
      data.projectId,
      data.description,
      data.dialogueSnippet ?? null,
      data.position ?? null,
      data.sourceIdeaId ?? null,
      ts,
      ts,
    );
  })();
  return getScene(db, data.id) as Scene;
}

/**
 * Fetch a single scene by ID. Returns null if not found.
 */
export function getScene(db: Database.Database, sceneId: string): Scene | null {
  const row = db
    .prepare(`SELECT * FROM scenes WHERE id = ?`)
    .get(sceneId) as SceneRow | undefined;
  return row ? rowToScene(row) : null;
}

export interface UpdateSceneData {
  description?: string;
  dialogueSnippet?: string | null;
  position?: 1 | 2 | 3 | null;
  updatedAt?: string;
}

/**
 * Partial-update a scene. Returns updated scene or null.
 */
export function updateScene(
  db: Database.Database,
  sceneId: string,
  patch: UpdateSceneData,
): Scene | null {
  const ts = patch.updatedAt ?? now();
  const setClauses: string[] = ['updated_at = ?'];
  const setParams: unknown[] = [ts];

  if (patch.description !== undefined) { setClauses.push('description = ?'); setParams.push(patch.description); }
  if ('dialogueSnippet' in patch) { setClauses.push('dialogue_snippet = ?'); setParams.push(patch.dialogueSnippet ?? null); }
  if ('position' in patch) { setClauses.push('position = ?'); setParams.push(patch.position ?? null); }

  db.transaction(() => {
    db.prepare(`UPDATE scenes SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams, sceneId);
  })();

  return getScene(db, sceneId);
}

/**
 * Permanently delete a scene. Returns the number of rows deleted.
 */
export function deleteScene(db: Database.Database, sceneId: string): number {
  const result = db.prepare(`DELETE FROM scenes WHERE id = ?`).run(sceneId);
  return result.changes;
}
