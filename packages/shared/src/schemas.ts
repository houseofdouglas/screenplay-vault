import { z } from 'zod';
import { IDEA_TYPES, PROJECT_STATUSES } from './types.js';

// ---------------------------------------------------------------------------
// Primitive re-usables
// ---------------------------------------------------------------------------

const ideaTypeEnum = z.enum(IDEA_TYPES as [string, ...string[]] as [
  'WHAT_IF',
  'CHARACTER',
  'SETTING',
  'FIRST_LINE',
  'SCENE',
  'THEME',
  'NEWS_FLASH',
]);

const projectStatusEnum = z.enum(
  PROJECT_STATUSES as ['DEVELOPING', 'ACTIVE', 'SHELVED'],
);

const isoDateString = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}T/));

const tagItem = z
  .string()
  .min(1, 'Tags must be at least 1 character')
  .max(50, 'Tags must be 50 characters or less');

const tagsArray = z.array(tagItem).max(20, 'Maximum 20 tags allowed');

// ---------------------------------------------------------------------------
// Idea schemas
// ---------------------------------------------------------------------------

/** Schema for POST /api/v1/ideas request body. */
export const CreateIdeaSchema = z.object({
  type: ideaTypeEnum.nullable().optional(),
  content: z.string().min(1, 'Content is required').max(2000, 'Content must be 2000 characters or less').trim(),
  projectId: z.string().nullable().optional(),
  tags: tagsArray.default([]),
  excitement: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
});

export type CreateIdeaInput = z.infer<typeof CreateIdeaSchema>;

/** Schema for PATCH /api/v1/ideas/:id request body. */
export const PatchIdeaSchema = z.object({
  type: ideaTypeEnum.nullable().optional(),
  content: z.string().min(1).max(2000).trim().optional(),
  projectId: z.string().nullable().optional(),
  tags: tagsArray.optional(),
  excitement: z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable().optional(),
  lastReviewedAt: isoDateString.optional(),
}).strict();

export type PatchIdeaInput = z.infer<typeof PatchIdeaSchema>;

/** Schema for GET /api/v1/ideas query params. */
export const ListIdeasQuerySchema = z.object({
  type: ideaTypeEnum.optional(),
  projectId: z.string().optional(),
  q: z.string().optional(),
  sort: z.enum(['recent', 'type', 'last_reviewed']).default('recent'),
  archived: z.enum(['true', 'false']).default('false'),
  /** When 'true', restrict to ideas not reviewed in >14 days (or never reviewed and created >14 days ago). */
  stale: z.enum(['true', 'false']).optional(),
});

export type ListIdeasQuery = z.infer<typeof ListIdeasQuerySchema>;

// ---------------------------------------------------------------------------
// Project schemas
// ---------------------------------------------------------------------------

/** Schema for POST /api/v1/projects request body. */
export const CreateProjectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less').trim(),
  logline: z.string().max(500, 'Logline must be 500 characters or less').optional(),
  status: projectStatusEnum.default('DEVELOPING'),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

/** Schema for PATCH /api/v1/projects/:id request body. */
export const PatchProjectSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  logline: z.string().max(500).nullable().optional(),
  status: projectStatusEnum.optional(),
}).strict();

export type PatchProjectInput = z.infer<typeof PatchProjectSchema>;

// ---------------------------------------------------------------------------
// Character schemas
// ---------------------------------------------------------------------------

/** Schema for POST /api/v1/projects/:id/characters request body. */
export const CreateCharacterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less').trim(),
  obsession: z.string().min(1, 'Obsession is required').max(300, 'Obsession must be 300 characters or less'),
  occupation: z.string().min(1, 'Occupation is required').max(200, 'Occupation must be 200 characters or less').trim(),
  notes: z.string().max(2000, 'Notes must be 2000 characters or less').optional(),
});

export type CreateCharacterInput = z.infer<typeof CreateCharacterSchema>;

/** Schema for PATCH /api/v1/projects/:id/characters/:charId request body. */
export const PatchCharacterSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  obsession: z.string().min(1).max(300).optional(),
  occupation: z.string().min(1).max(200).trim().optional(),
  notes: z.string().max(2000).nullable().optional(),
}).strict();

export type PatchCharacterInput = z.infer<typeof PatchCharacterSchema>;

// ---------------------------------------------------------------------------
// Scene schemas
// ---------------------------------------------------------------------------

const actPosition = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Schema for POST /api/v1/projects/:id/scenes request body. */
export const CreateSceneSchema = z.object({
  description: z
    .string()
    .min(1, 'Scene description is required')
    .max(1000, 'Description must be 1000 characters or less'),
  dialogueSnippet: z.string().max(500, 'Dialogue snippet must be 500 characters or less').optional(),
  position: actPosition.nullable().optional(),
  sourceIdeaId: z.string().optional(),
});

export type CreateSceneInput = z.infer<typeof CreateSceneSchema>;

/** Schema for PATCH /api/v1/projects/:id/scenes/:sceneId request body. */
export const PatchSceneSchema = z.object({
  description: z.string().min(1).max(1000).optional(),
  dialogueSnippet: z.string().max(500).nullable().optional(),
  position: actPosition.nullable().optional(),
}).strict();

export type PatchSceneInput = z.infer<typeof PatchSceneSchema>;

/** Schema for GET /api/v1/projects/:id/scenes query params. */
export const ListScenesQuerySchema = z.object({
  act: z.union([z.literal('1'), z.literal('2'), z.literal('3'), z.literal('unplaced')]).optional(),
});

export type ListScenesQuery = z.infer<typeof ListScenesQuerySchema>;
