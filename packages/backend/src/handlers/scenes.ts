import type { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { CreateSceneSchema, PatchSceneSchema, ListScenesQuerySchema } from 'shared';
import type { AppEnv } from '../app.js';
import { getProject } from '../repositories/project-repository.js';
import {
  listScenes,
  createScene,
  getScene,
  updateScene,
  deleteScene,
} from '../repositories/scene-repository.js';
import type { ActFilter } from '../repositories/scene-repository.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const notFound = (msg: string) => ({ error: 'NOT_FOUND', message: msg });

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
 * Register all scene routes on the given Hono app instance.
 * All routes are nested under /api/v1/projects/:id/scenes.
 */
export function registerSceneRoutes(app: Hono<AppEnv>): void {
  // ---- GET /api/v1/projects/:id/scenes ------------------------------------
  app.get('/api/v1/projects/:id/scenes', (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);

    const queryParsed = ListScenesQuerySchema.safeParse({ act: c.req.query('act') });
    if (!queryParsed.success) {
      return c.json(validationError(queryParsed.error.issues), 400);
    }

    let actFilter: ActFilter | undefined;
    if (queryParsed.data.act !== undefined) {
      actFilter = queryParsed.data.act === 'unplaced'
        ? 'unplaced'
        : (parseInt(queryParsed.data.act, 10) as ActFilter);
    }

    const result = listScenes(db, projectId, actFilter);
    return c.json(result);
  });

  // ---- POST /api/v1/projects/:id/scenes -----------------------------------
  app.post('/api/v1/projects/:id/scenes', async (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);

    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateSceneSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const scene = createScene(db, {
      id: uuid(),
      projectId,
      description: parsed.data.description,
      dialogueSnippet: parsed.data.dialogueSnippet ?? null,
      position: parsed.data.position ?? null,
      sourceIdeaId: parsed.data.sourceIdeaId ?? null,
    });

    return c.json({ data: scene }, 201);
  });

  // ---- PATCH /api/v1/projects/:id/scenes/:sceneId -------------------------
  app.patch('/api/v1/projects/:id/scenes/:sceneId', async (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);

    const sceneId = c.req.param('sceneId');
    const existing = getScene(db, sceneId);
    if (!existing || existing.projectId !== projectId) {
      return c.json(notFound('Scene not found'), 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = PatchSceneSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const scene = updateScene(db, sceneId, {
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...('dialogueSnippet' in parsed.data && { dialogueSnippet: parsed.data.dialogueSnippet }),
      ...('position' in parsed.data && { position: parsed.data.position }),
    });

    return c.json({ data: scene });
  });

  // ---- DELETE /api/v1/projects/:id/scenes/:sceneId ------------------------
  app.delete('/api/v1/projects/:id/scenes/:sceneId', (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);

    const sceneId = c.req.param('sceneId');
    const existing = getScene(db, sceneId);
    if (!existing || existing.projectId !== projectId) {
      return c.json(notFound('Scene not found'), 404);
    }

    deleteScene(db, sceneId);
    return c.body(null, 204);
  });
}
