import type Database from 'better-sqlite3';
import type { Project, ProjectStatus, ProjectWithCounts } from 'shared';

// ---------------------------------------------------------------------------
// Internal row shape
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  title: string;
  logline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  idea_count: number;
  character_count: number;
  scene_count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToProject(row: ProjectRow): ProjectWithCounts {
  return {
    id: row.id,
    title: row.title,
    logline: row.logline,
    status: row.status as ProjectStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ideaCount: row.idea_count,
    characterCount: row.character_count,
    sceneCount: row.scene_count,
  };
}

function now(): string {
  return new Date().toISOString();
}

const WITH_COUNTS_SQL = `
  SELECT
    p.*,
    COUNT(DISTINCT i.id) AS idea_count,
    COUNT(DISTINCT c.id) AS character_count,
    COUNT(DISTINCT s.id) AS scene_count
  FROM projects p
  LEFT JOIN ideas i ON i.project_id = p.id AND i.archived_at IS NULL
  LEFT JOIN characters c ON c.project_id = p.id
  LEFT JOIN scenes s ON s.project_id = p.id
`;

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * List all projects for a user sorted by updatedAt DESC, with aggregate counts.
 */
export function listProjects(db: Database.Database): ProjectWithCounts[] {
  const rows = db
    .prepare(`${WITH_COUNTS_SQL} GROUP BY p.id ORDER BY p.updated_at DESC`)
    .all() as ProjectRow[];
  return rows.map(rowToProject);
}

export interface CreateProjectData {
  id: string;
  title: string;
  logline?: string | null;
  status?: ProjectStatus;
}

/**
 * Insert a new project and return it with zero counts.
 */
export function createProject(db: Database.Database, data: CreateProjectData): ProjectWithCounts {
  const ts = now();
  const status = data.status ?? 'DEVELOPING';

  db.transaction(() => {
    db.prepare(
      `INSERT INTO projects (id, title, logline, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(data.id, data.title, data.logline ?? null, status, ts, ts);
  })();

  return getProject(db, data.id) as ProjectWithCounts;
}

/**
 * Fetch a single project with aggregate counts. Returns null if not found.
 */
export function getProject(db: Database.Database, projectId: string): ProjectWithCounts | null {
  const row = db
    .prepare(`${WITH_COUNTS_SQL} WHERE p.id = ? GROUP BY p.id`)
    .get(projectId) as ProjectRow | undefined;

  return row ? rowToProject(row) : null;
}

export interface UpdateProjectData {
  title?: string;
  logline?: string | null;
  status?: ProjectStatus;
  updatedAt?: string;
}

/**
 * Partial-update a project. Always sets updatedAt. Returns the updated project or null.
 */
export function updateProject(
  db: Database.Database,
  projectId: string,
  patch: UpdateProjectData,
): ProjectWithCounts | null {
  const ts = patch.updatedAt ?? now();
  const setClauses: string[] = ['updated_at = ?'];
  const setParams: unknown[] = [ts];

  if (patch.title !== undefined) { setClauses.push('title = ?'); setParams.push(patch.title); }
  if ('logline' in patch) { setClauses.push('logline = ?'); setParams.push(patch.logline ?? null); }
  if (patch.status !== undefined) { setClauses.push('status = ?'); setParams.push(patch.status); }

  db.transaction(() => {
    db.prepare(`UPDATE projects SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams, projectId);
  })();

  return getProject(db, projectId);
}

/**
 * Return a bare Project (without counts) — used internally when only
 * ownership checks are needed. Returns null if not found.
 */
export function getProjectBase(db: Database.Database, projectId: string): Project | null {
  const row = db
    .prepare(`SELECT * FROM projects WHERE id = ?`)
    .get(projectId) as (Omit<ProjectRow, 'idea_count' | 'character_count' | 'scene_count'>) | undefined;

  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    logline: row.logline,
    status: row.status as ProjectStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
