import { describe, it, expect } from 'vitest';
import {
  CreateIdeaSchema,
  PatchIdeaSchema,
  ListIdeasQuerySchema,
  CreateProjectSchema,
  PatchProjectSchema,
  CreateCharacterSchema,
  PatchCharacterSchema,
  CreateSceneSchema,
  PatchSceneSchema,
} from './schemas.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(schema: { parse: (v: unknown) => T }, value: unknown): T {
  return schema.parse(value);
}

function fail(schema: { safeParse: (v: unknown) => { success: boolean; error?: { issues: { path: (string | number)[] }[] } } }, value: unknown): string[] {
  const result = schema.safeParse(value);
  if (result.success) throw new Error('Expected validation failure but it passed');
  return result.error!.issues.map((i) => i.path.join('.'));
}

// ---------------------------------------------------------------------------
// CreateIdeaSchema
// ---------------------------------------------------------------------------

describe('CreateIdeaSchema', () => {
  it('accepts minimal valid input (content only)', () => {
    const r = ok(CreateIdeaSchema, { content: 'What if whales could vote?' });
    expect(r.content).toBe('What if whales could vote?');
    expect(r.tags).toEqual([]);
    expect(r.type).toBeUndefined();
  });

  it('accepts full valid input', () => {
    const r = ok(CreateIdeaSchema, {
      type: 'WHAT_IF',
      content: 'An idea',
      projectId: 'proj-1',
      tags: ['tag1', 'tag2'],
      excitement: 3,
    });
    expect(r.type).toBe('WHAT_IF');
    expect(r.excitement).toBe(3);
  });

  it('accepts type: null (raw/untyped)', () => {
    const r = ok(CreateIdeaSchema, { content: 'raw idea', type: null });
    expect(r.type).toBeNull();
  });

  it('trims content', () => {
    const r = ok(CreateIdeaSchema, { content: '  trimmed  ' });
    expect(r.content).toBe('trimmed');
  });

  it('rejects empty content', () => {
    const fields = fail(CreateIdeaSchema, { content: '' });
    expect(fields).toContain('content');
  });

  it('rejects content over 2000 chars', () => {
    const fields = fail(CreateIdeaSchema, { content: 'x'.repeat(2001) });
    expect(fields).toContain('content');
  });

  it('rejects invalid type value', () => {
    const fields = fail(CreateIdeaSchema, { content: 'ok', type: 'INVALID_TYPE' });
    expect(fields).toContain('type');
  });

  it('rejects more than 20 tags', () => {
    const fields = fail(CreateIdeaSchema, {
      content: 'ok',
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    });
    expect(fields).toContain('tags');
  });

  it('rejects a tag over 50 chars', () => {
    const fields = fail(CreateIdeaSchema, {
      content: 'ok',
      tags: ['x'.repeat(51)],
    });
    expect(fields).toContain('tags.0');
  });

  it('rejects excitement outside [1,2,3]', () => {
    const fields = fail(CreateIdeaSchema, { content: 'ok', excitement: 4 });
    expect(fields).toContain('excitement');
  });

  it('accepts all valid IdeaType values', () => {
    const types = ['WHAT_IF', 'CHARACTER', 'SETTING', 'FIRST_LINE', 'SCENE', 'THEME', 'NEWS_FLASH'] as const;
    for (const t of types) {
      expect(() => ok(CreateIdeaSchema, { content: 'ok', type: t })).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// PatchIdeaSchema
// ---------------------------------------------------------------------------

describe('PatchIdeaSchema', () => {
  it('accepts empty object (no-op patch)', () => {
    expect(() => ok(PatchIdeaSchema, {})).not.toThrow();
  });

  it('accepts excitement: null (clear rating)', () => {
    const r = ok(PatchIdeaSchema, { excitement: null });
    expect(r.excitement).toBeNull();
  });

  it('accepts type: null (remove type)', () => {
    const r = ok(PatchIdeaSchema, { type: null });
    expect(r.type).toBeNull();
  });

  it('rejects unknown fields (strict)', () => {
    const fields = fail(PatchIdeaSchema, { unknownField: 'value' });
    expect(fields.length).toBeGreaterThan(0);
  });

  it('accepts lastReviewedAt as ISO 8601 string', () => {
    expect(() =>
      ok(PatchIdeaSchema, { lastReviewedAt: '2026-03-22T10:00:00.000Z' }),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// ListIdeasQuerySchema
// ---------------------------------------------------------------------------

describe('ListIdeasQuerySchema', () => {
  it('applies defaults when nothing supplied', () => {
    const r = ok(ListIdeasQuerySchema, {});
    expect(r.sort).toBe('recent');
    expect(r.archived).toBe('false');
  });

  it('accepts all valid sort values', () => {
    for (const sort of ['recent', 'type', 'last_reviewed'] as const) {
      expect(() => ok(ListIdeasQuerySchema, { sort })).not.toThrow();
    }
  });

  it('accepts archived: true', () => {
    const r = ok(ListIdeasQuerySchema, { archived: 'true' });
    expect(r.archived).toBe('true');
  });

  it('rejects an invalid type filter', () => {
    const fields = fail(ListIdeasQuerySchema, { type: 'BANANA' });
    expect(fields).toContain('type');
  });
});

// ---------------------------------------------------------------------------
// CreateProjectSchema
// ---------------------------------------------------------------------------

describe('CreateProjectSchema', () => {
  it('accepts minimal valid input', () => {
    const r = ok(CreateProjectSchema, { title: 'My Script' });
    expect(r.title).toBe('My Script');
    expect(r.status).toBe('DEVELOPING');
  });

  it('trims title', () => {
    const r = ok(CreateProjectSchema, { title: '  Trimmed Title  ' });
    expect(r.title).toBe('Trimmed Title');
  });

  it('rejects empty title', () => {
    const fields = fail(CreateProjectSchema, { title: '' });
    expect(fields).toContain('title');
  });

  it('rejects title over 200 chars', () => {
    const fields = fail(CreateProjectSchema, { title: 'x'.repeat(201) });
    expect(fields).toContain('title');
  });

  it('rejects logline over 500 chars', () => {
    const fields = fail(CreateProjectSchema, { title: 'ok', logline: 'x'.repeat(501) });
    expect(fields).toContain('logline');
  });

  it('rejects invalid status', () => {
    const fields = fail(CreateProjectSchema, { title: 'ok', status: 'ARCHIVED' });
    expect(fields).toContain('status');
  });

  it('accepts all valid ProjectStatus values', () => {
    for (const status of ['DEVELOPING', 'ACTIVE', 'SHELVED'] as const) {
      expect(() => ok(CreateProjectSchema, { title: 'ok', status })).not.toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// PatchProjectSchema
// ---------------------------------------------------------------------------

describe('PatchProjectSchema', () => {
  it('accepts logline: null (clear it)', () => {
    const r = ok(PatchProjectSchema, { logline: null });
    expect(r.logline).toBeNull();
  });

  it('rejects unknown fields (strict)', () => {
    const fields = fail(PatchProjectSchema, { weird: 'field' });
    expect(fields.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CreateCharacterSchema
// ---------------------------------------------------------------------------

describe('CreateCharacterSchema', () => {
  const validChar = { name: 'Alice', obsession: 'revenge', occupation: 'detective' };

  it('accepts valid input', () => {
    expect(() => ok(CreateCharacterSchema, validChar)).not.toThrow();
  });

  it('rejects empty name', () => {
    const fields = fail(CreateCharacterSchema, { ...validChar, name: '' });
    expect(fields).toContain('name');
  });

  it('rejects name over 100 chars', () => {
    const fields = fail(CreateCharacterSchema, { ...validChar, name: 'x'.repeat(101) });
    expect(fields).toContain('name');
  });

  it('rejects obsession over 300 chars', () => {
    const fields = fail(CreateCharacterSchema, { ...validChar, obsession: 'x'.repeat(301) });
    expect(fields).toContain('obsession');
  });

  it('rejects occupation over 200 chars', () => {
    const fields = fail(CreateCharacterSchema, { ...validChar, occupation: 'x'.repeat(201) });
    expect(fields).toContain('occupation');
  });

  it('rejects notes over 2000 chars', () => {
    const fields = fail(CreateCharacterSchema, { ...validChar, notes: 'x'.repeat(2001) });
    expect(fields).toContain('notes');
  });
});

// ---------------------------------------------------------------------------
// PatchCharacterSchema
// ---------------------------------------------------------------------------

describe('PatchCharacterSchema', () => {
  it('accepts notes: null (clear it)', () => {
    const r = ok(PatchCharacterSchema, { notes: null });
    expect(r.notes).toBeNull();
  });

  it('rejects unknown fields (strict)', () => {
    const fields = fail(PatchCharacterSchema, { unknown: 'x' });
    expect(fields.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// CreateSceneSchema
// ---------------------------------------------------------------------------

describe('CreateSceneSchema', () => {
  const validScene = { description: 'INT. OFFICE — DAY. The door opens.' };

  it('accepts minimal valid input', () => {
    expect(() => ok(CreateSceneSchema, validScene)).not.toThrow();
  });

  it('accepts position values 1, 2, 3', () => {
    for (const position of [1, 2, 3] as const) {
      expect(() => ok(CreateSceneSchema, { ...validScene, position })).not.toThrow();
    }
  });

  it('accepts position: null (unplaced)', () => {
    const r = ok(CreateSceneSchema, { ...validScene, position: null });
    expect(r.position).toBeNull();
  });

  it('rejects empty description', () => {
    const fields = fail(CreateSceneSchema, { description: '' });
    expect(fields).toContain('description');
  });

  it('rejects description over 1000 chars', () => {
    const fields = fail(CreateSceneSchema, { description: 'x'.repeat(1001) });
    expect(fields).toContain('description');
  });

  it('rejects dialogueSnippet over 500 chars', () => {
    const fields = fail(CreateSceneSchema, { ...validScene, dialogueSnippet: 'x'.repeat(501) });
    expect(fields).toContain('dialogueSnippet');
  });

  it('rejects position outside [1, 2, 3]', () => {
    const fields = fail(CreateSceneSchema, { ...validScene, position: 4 });
    expect(fields).toContain('position');
  });
});

// ---------------------------------------------------------------------------
// PatchSceneSchema
// ---------------------------------------------------------------------------

describe('PatchSceneSchema', () => {
  it('accepts dialogueSnippet: null (clear it)', () => {
    const r = ok(PatchSceneSchema, { dialogueSnippet: null });
    expect(r.dialogueSnippet).toBeNull();
  });

  it('accepts position: null (unplace a scene)', () => {
    const r = ok(PatchSceneSchema, { position: null });
    expect(r.position).toBeNull();
  });

  it('rejects unknown fields (strict)', () => {
    const fields = fail(PatchSceneSchema, { unknown: 'x' });
    expect(fields.length).toBeGreaterThan(0);
  });
});
