import type { Hono } from 'hono';
import { v4 as uuid } from 'uuid';
import { CreateProjectSchema, PatchProjectSchema } from 'shared';
import type { AppEnv } from '../app.js';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
} from '../repositories/project-repository.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const projectNotFound = () => ({ error: 'NOT_FOUND', message: 'Project not found' });

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
 * Register all project routes on the given Hono app instance.
 */
export function registerProjectRoutes(app: Hono<AppEnv>): void {
  // ---- GET /api/v1/projects -----------------------------------------------
  app.get('/api/v1/projects', (c) => {
    const db = c.get('db');
    const projects = listProjects(db);
    return c.json({ data: projects });
  });

  // ---- POST /api/v1/projects ----------------------------------------------
  app.post('/api/v1/projects', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const db = c.get('db');
    const project = createProject(db, {
      id: uuid(),
      title: parsed.data.title,
      logline: parsed.data.logline ?? null,
      status: parsed.data.status,
    });

    return c.json({ data: project }, 201);
  });

  // ---- GET /api/v1/projects/:id -------------------------------------------
  app.get('/api/v1/projects/:id', (c) => {
    const db = c.get('db');
    const project = getProject(db, c.req.param('id'));
    if (!project) return c.json(projectNotFound(), 404);
    return c.json({ data: project });
  });

  // ---- PATCH /api/v1/projects/:id -----------------------------------------
  app.patch('/api/v1/projects/:id', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const parsed = PatchProjectSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(validationError(parsed.error.issues), 400);
    }

    const db = c.get('db');
    const projectId = c.req.param('id');

    if (!getProject(db, projectId)) return c.json(projectNotFound(), 404);

    const project = updateProject(db, projectId, {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...('logline' in parsed.data && { logline: parsed.data.logline }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
    });

    return c.json({ data: project });
  });
}
