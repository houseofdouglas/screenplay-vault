import type Database from 'better-sqlite3';
import type { Idea, IdeaType, IdeasListMeta } from 'shared';

// ---------------------------------------------------------------------------
// Internal row shape (snake_case from SQLite → camelCase on exit)
// ---------------------------------------------------------------------------

interface IdeaRow {
  id: string;
  type: string | null;
  content: string;
  project_id: string | null;
  excitement: number | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  tags: string | null; // comma-joined by GROUP_CONCAT
}

interface TypeCountRow {
  type: string | null;
  count: number;
}

interface ProjectCountRow {
  project_id: string | null;
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rowToIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    type: (row.type ?? null) as IdeaType | null,
    content: row.content,
    projectId: row.project_id,
    excitement: (row.excitement ?? null) as 1 | 2 | 3 | null,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastReviewedAt: row.reviewed_at,
    tags: row.tags ? row.tags.split(',').filter(Boolean) : [],
  };
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// List options
// ---------------------------------------------------------------------------

export interface ListIdeasOptions {
  type?: IdeaType;
  /** 'unassigned' filters to ideas with project_id IS NULL */
  projectId?: string;
  /** keyword: matches content substring OR exact tag */
  q?: string;
  sort?: 'recent' | 'type' | 'last_reviewed';
  archived?: boolean;
  /** When true, restrict to ideas not reviewed in >14 days (or never reviewed and created >14 days ago). */
  stale?: boolean;
}

export interface ListIdeasResult {
  data: Idea[];
  meta: IdeasListMeta;
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * List ideas with optional filtering, keyword search, and sorting.
 * Also returns aggregate counts for type and project sidebar filters.
 */
export function listIdeas(db: Database.Database, opts: ListIdeasOptions = {}): ListIdeasResult {
  const { type, projectId, q, sort = 'recent', archived = false, stale = false } = opts;

  // ---- Build WHERE clauses ------------------------------------------------
  const conditions: string[] = [];
  const params: unknown[] = [];

  // archived filter
  if (archived) {
    conditions.push('i.archived_at IS NOT NULL');
  } else {
    conditions.push('i.archived_at IS NULL');
  }

  // stale filter: reviewed_at older than 14 days, or null with created_at older than 14 days
  if (stale) {
    conditions.push(
      "(i.reviewed_at < datetime('now', '-14 days') OR (i.reviewed_at IS NULL AND i.created_at < datetime('now', '-14 days')))"
    );
  }

  // type filter
  if (type !== undefined) {
    conditions.push('i.type = ?');
    params.push(type);
  }

  // projectId filter
  if (projectId !== undefined) {
    if (projectId === 'unassigned') {
      conditions.push('i.project_id IS NULL');
    } else {
      conditions.push('i.project_id = ?');
      params.push(projectId);
    }
  }

  // keyword: content LIKE or exact tag match
  if (q !== undefined && q.trim() !== '') {
    conditions.push(
      "(i.content LIKE '%' || ? || '%' OR i.id IN (SELECT idea_id FROM tags WHERE tag = ?))",
    );
    params.push(q, q);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // ---- ORDER BY -----------------------------------------------------------
  let orderBy: string;
  switch (sort) {
    case 'type':
      orderBy = 'i.type ASC NULLS LAST, i.created_at DESC';
      break;
    case 'last_reviewed':
      orderBy = 'i.reviewed_at ASC NULLS FIRST, i.created_at DESC';
      break;
    case 'recent':
    default:
      orderBy = 'i.created_at DESC';
  }

  // ---- Main query with GROUP_CONCAT for tags --------------------------------
  const sql = `
    SELECT
      i.id, i.type, i.content, i.project_id, i.excitement,
      i.archived_at, i.created_at, i.updated_at, i.reviewed_at,
      GROUP_CONCAT(t.tag) AS tags
    FROM ideas i
    LEFT JOIN tags t ON t.idea_id = i.id
    ${whereClause}
    GROUP BY i.id
    ORDER BY ${orderBy}
  `;

  const rows = db.prepare(sql).all(...params) as IdeaRow[];
  const data = rows.map(rowToIdea);

  // ---- Type counts (always over entire unarchived/archived set w/ no other filters) ---
  const typeCountRows = db
    .prepare(
      `SELECT type, COUNT(*) AS count FROM ideas
       WHERE ${archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'}
       GROUP BY type`,
    )
    .all() as TypeCountRow[];

  const typeCounts: Record<IdeaType | 'UNTYPED', number> = {
    WHAT_IF: 0,
    CHARACTER: 0,
    SETTING: 0,
    FIRST_LINE: 0,
    SCENE: 0,
    THEME: 0,
    NEWS_FLASH: 0,
    UNTYPED: 0,
  };
  for (const row of typeCountRows) {
    const key = (row.type ?? 'UNTYPED') as IdeaType | 'UNTYPED';
    typeCounts[key] = row.count;
  }

  // ---- Project counts (same scope as type counts) -------------------------
  const projectCountRows = db
    .prepare(
      `SELECT project_id, COUNT(*) AS count FROM ideas
       WHERE ${archived ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'}
       GROUP BY project_id`,
    )
    .all() as ProjectCountRow[];

  const projectCounts: Record<string, number> = {};
  for (const row of projectCountRows) {
    const key = row.project_id ?? 'unassigned';
    projectCounts[key] = row.count;
  }

  return {
    data,
    meta: {
      total: data.length,
      typeCounts,
      projectCounts,
      staleCutoffDays: 14,
    },
  };
}

export interface CreateIdeaData {
  id: string;
  type?: IdeaType | null;
  content: string;
  projectId?: string | null;
  tags?: string[];
  excitement?: 1 | 2 | 3;
}

/**
 * Insert a new idea and its tags atomically.
 */
export function createIdea(db: Database.Database, data: CreateIdeaData): Idea {
  const ts = now();

  db.transaction(() => {
    db.prepare(
      `INSERT INTO ideas (id, type, content, project_id, excitement, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      data.id,
      data.type ?? null,
      data.content,
      data.projectId ?? null,
      data.excitement ?? null,
      ts,
      ts,
    );

    for (const tag of data.tags ?? []) {
      db.prepare(`INSERT INTO tags (idea_id, tag) VALUES (?, ?)`).run(data.id, tag);
    }
  })();

  return getIdea(db, data.id) as Idea;
}

/**
 * Fetch a single idea by ID, including its tags. Returns null if not found.
 */
export function getIdea(db: Database.Database, ideaId: string): Idea | null {
  const row = db
    .prepare(
      `SELECT
         i.id, i.type, i.content, i.project_id, i.excitement,
         i.archived_at, i.created_at, i.updated_at, i.reviewed_at,
         GROUP_CONCAT(t.tag) AS tags
       FROM ideas i
       LEFT JOIN tags t ON t.idea_id = i.id
       WHERE i.id = ?
       GROUP BY i.id`,
    )
    .get(ideaId) as IdeaRow | undefined;

  return row ? rowToIdea(row) : null;
}

export interface UpdateIdeaData {
  type?: IdeaType | null;
  content?: string;
  projectId?: string | null;
  tags?: string[];
  excitement?: 1 | 2 | 3 | null;
  lastReviewedAt?: string;
  archivedAt?: string | null;
  updatedAt?: string;
}

/**
 * Partial-update an idea. Only supplied fields are written.
 * Tags are replaced wholesale when provided.
 */
export function updateIdea(db: Database.Database, ideaId: string, patch: UpdateIdeaData): Idea | null {
  const ts = patch.updatedAt ?? now();
  const setClauses: string[] = ['updated_at = ?'];
  const setParams: unknown[] = [ts];

  if ('type' in patch) { setClauses.push('type = ?'); setParams.push(patch.type ?? null); }
  if (patch.content !== undefined) { setClauses.push('content = ?'); setParams.push(patch.content); }
  if ('projectId' in patch) { setClauses.push('project_id = ?'); setParams.push(patch.projectId ?? null); }
  if ('excitement' in patch) { setClauses.push('excitement = ?'); setParams.push(patch.excitement ?? null); }
  if (patch.lastReviewedAt !== undefined) { setClauses.push('reviewed_at = ?'); setParams.push(patch.lastReviewedAt); }
  if ('archivedAt' in patch) { setClauses.push('archived_at = ?'); setParams.push(patch.archivedAt ?? null); }

  db.transaction(() => {
    db.prepare(`UPDATE ideas SET ${setClauses.join(', ')} WHERE id = ?`).run(...setParams, ideaId);

    if (patch.tags !== undefined) {
      db.prepare(`DELETE FROM tags WHERE idea_id = ?`).run(ideaId);
      for (const tag of patch.tags) {
        db.prepare(`INSERT INTO tags (idea_id, tag) VALUES (?, ?)`).run(ideaId, tag);
      }
    }
  })();

  return getIdea(db, ideaId);
}

/**
 * Soft-archive an idea by setting archived_at to now.
 */
export function archiveIdea(db: Database.Database, ideaId: string): Idea | null {
  const ts = now();
  db.prepare(`UPDATE ideas SET archived_at = ?, updated_at = ? WHERE id = ?`).run(ts, ts, ideaId);
  return getIdea(db, ideaId);
}

/**
 * Restore a previously archived idea by clearing archived_at.
 */
export function restoreIdea(db: Database.Database, ideaId: string): Idea | null {
  const ts = now();
  db.prepare(`UPDATE ideas SET archived_at = NULL, updated_at = ? WHERE id = ?`).run(ts, ideaId);
  return getIdea(db, ideaId);
}
