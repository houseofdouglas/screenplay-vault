import type { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { CreateCharacterSchema, PatchCharacterSchema } from 'shared';
import type { AppEnv } from '../app.js';
import { getProject } from '../repositories/project-repository.js';
import {
  listCharacters,
  createCharacter,
  getCharacter,
  updateCharacter,
  deleteCharacter,
} from '../repositories/character-repository.js';

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
 * Register all character routes on the given Hono app instance.
 * All routes are nested under /api/v1/projects/:id/characters.
 */
export function registerCharacterRoutes(app: Hono<AppEnv>): void {
  // ---- GET /api/v1/projects/:id/characters --------------------------------
  app.get('/api/v1/projects/:id/characters', (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);
    const characters = listCharacters(db, projectId);
    return c.json({ data: characters });
  });

  // ---- POST /api/v1/projects/:id/characters --------------------------------
  app.post('/api/v1/projects/:id/characters', async (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);

    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateCharacterSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const character = createCharacter(db, {
      id: uuid(),
      projectId,
      name: parsed.data.name,
      obsession: parsed.data.obsession,
      occupation: parsed.data.occupation,
      notes: parsed.data.notes ?? null,
    });

    return c.json({ data: character }, 201);
  });

  // ---- PATCH /api/v1/projects/:id/characters/:charId ----------------------
  app.patch('/api/v1/projects/:id/characters/:charId', async (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);

    const charId = c.req.param('charId');
    const existing = getCharacter(db, charId);
    if (!existing || existing.projectId !== projectId) {
      return c.json(notFound('Character not found'), 404);
    }

    const body = await c.req.json().catch(() => ({}));
    const parsed = PatchCharacterSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const character = updateCharacter(db, charId, {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.obsession !== undefined && { obsession: parsed.data.obsession }),
      ...(parsed.data.occupation !== undefined && { occupation: parsed.data.occupation }),
      ...('notes' in parsed.data && { notes: parsed.data.notes }),
    });

    return c.json({ data: character });
  });

  // ---- DELETE /api/v1/projects/:id/characters/:charId ---------------------
  app.delete('/api/v1/projects/:id/characters/:charId', (c) => {
    const db = c.get('db');
    const projectId = c.req.param('id');
    if (!getProject(db, projectId)) return c.json(notFound('Project not found'), 404);

    const charId = c.req.param('charId');
    const existing = getCharacter(db, charId);
    if (!existing || existing.projectId !== projectId) {
      return c.json(notFound('Character not found'), 404);
    }

    deleteCharacter(db, charId);
    return c.body(null, 204);
  });
}
