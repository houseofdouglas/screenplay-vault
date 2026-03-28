import type { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import {
  CreateIdeaSchema,
  PatchIdeaSchema,
  ListIdeasQuerySchema,
} from 'shared';
import type { AppEnv } from '../app.js';
import {
  listIdeas,
  createIdea,
  getIdea,
  updateIdea,
  archiveIdea,
  restoreIdea,
} from '../repositories/idea-repository.js';
import { getProjectBase } from '../repositories/project-repository.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Standard 404 body for ideas. */
const ideaNotFound = () => ({ error: 'NOT_FOUND', message: 'Idea not found' });

/** Standard 400 Zod validation error body. */
function validationError(issues: { path: (string | number)[]; message: string }[]): {
  error: string;
  message: string;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_root';
    fields[key] = issue.message;
  }
  return { error: 'VALIDATION_ERROR', message: 'Validation failed', fields };
}

// ---------------------------------------------------------------------------
// Route registration
// ---------------------------------------------------------------------------

/**
 * Register all idea routes on the given Hono app instance.
 * All routes require auth + DB (applied upstream in app.ts).
 */
export function registerIdeaRoutes(app: Hono<AppEnv>): void {
  // ---- GET /api/v1/ideas --------------------------------------------------
  app.get('/api/v1/ideas', (c) => {
    const parsed = ListIdeasQuerySchema.safeParse(c.req.query());
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }
    const { type, projectId, q, sort, archived, stale } = parsed.data;
    const db = c.get('db');

    const result = listIdeas(db, {
      type,
      projectId,
      q,
      sort,
      archived: archived === 'true',
      stale: stale === 'true',
    });

    return c.json(result);
  });

  // ---- POST /api/v1/ideas -------------------------------------------------
  app.post('/api/v1/ideas', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const { type, content, projectId, tags, excitement } = parsed.data;
    const db = c.get('db');

    // If a projectId is supplied, verify the project exists.
    if (projectId) {
      const project = getProjectBase(db, projectId);
      if (!project) {
        return c.json({ error: 'NOT_FOUND', message: 'Project not found' }, 404);
      }
    }

    const idea = createIdea(db, {
      id: uuid(),
      type: type ?? null,
      content,
      projectId: projectId ?? null,
      tags,
      excitement,
    });

    return c.json({ data: idea }, 201);
  });

  // ---- GET /api/v1/ideas/:id ----------------------------------------------
  app.get('/api/v1/ideas/:id', (c) => {
    const db = c.get('db');
    const idea = getIdea(db, c.req.param('id'));
    if (!idea) return c.json(ideaNotFound(), 404);
    return c.json({ data: idea });
  });

  // ---- PATCH /api/v1/ideas/:id --------------------------------------------
  app.patch('/api/v1/ideas/:id', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = PatchIdeaSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const patch = parsed.data;
    const db = c.get('db');
    const ideaId = c.req.param('id');

    // Verify idea exists.
    if (!getIdea(db, ideaId)) return c.json(ideaNotFound(), 404);

    // If a projectId is being set, verify the project exists.
    if (patch.projectId) {
      const project = getProjectBase(db, patch.projectId);
      if (!project) {
        return c.json({ error: 'NOT_FOUND', message: 'Project not found' }, 404);
      }
    }

    // Auto-set reviewed_at when content or excitement is patched without explicit lastReviewedAt.
    const updatedPatch = { ...patch };
    if (
      (patch.content !== undefined || 'excitement' in patch) &&
      patch.lastReviewedAt === undefined
    ) {
      updatedPatch.lastReviewedAt = new Date().toISOString();
    }

    const idea = updateIdea(db, ideaId, {
      ...(('type' in updatedPatch) && { type: updatedPatch.type }),
      ...(updatedPatch.content !== undefined && { content: updatedPatch.content }),
      ...('projectId' in updatedPatch && { projectId: updatedPatch.projectId }),
      ...(updatedPatch.tags !== undefined && { tags: updatedPatch.tags }),
      ...('excitement' in updatedPatch && { excitement: updatedPatch.excitement }),
      ...(updatedPatch.lastReviewedAt !== undefined && { lastReviewedAt: updatedPatch.lastReviewedAt }),
    });

    return c.json({ data: idea });
  });

  // ---- DELETE /api/v1/ideas/:id (soft-archive) ----------------------------
  app.delete('/api/v1/ideas/:id', (c) => {
    const db = c.get('db');
    const ideaId = c.req.param('id');
    if (!getIdea(db, ideaId)) return c.json(ideaNotFound(), 404);
    const idea = archiveIdea(db, ideaId);
    return c.json({ data: idea });
  });

  // ---- PATCH /api/v1/ideas/:id/restore ------------------------------------
  app.patch('/api/v1/ideas/:id/restore', (c) => {
    const db = c.get('db');
    const ideaId = c.req.param('id');
    if (!getIdea(db, ideaId)) return c.json(ideaNotFound(), 404);
    const idea = restoreIdea(db, ideaId);
    return c.json({ data: idea });
  });
}
