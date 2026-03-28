// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/** The seven categorisation types for screenplay ideas. */
export type IdeaType =
  | 'WHAT_IF'
  | 'CHARACTER'
  | 'SETTING'
  | 'FIRST_LINE'
  | 'SCENE'
  | 'THEME'
  | 'NEWS_FLASH';

export const IDEA_TYPES: IdeaType[] = [
  'WHAT_IF',
  'CHARACTER',
  'SETTING',
  'FIRST_LINE',
  'SCENE',
  'THEME',
  'NEWS_FLASH',
];

/** The lifecycle status of a screenplay project. */
export type ProjectStatus = 'DEVELOPING' | 'ACTIVE' | 'SHELVED';

export const PROJECT_STATUSES: ProjectStatus[] = ['DEVELOPING', 'ACTIVE', 'SHELVED'];

// ---------------------------------------------------------------------------
// Domain entities (camelCase — matching the API contract)
// ---------------------------------------------------------------------------

/** A captured idea in the vault. */
export interface Idea {
  id: string;
  type: IdeaType | null;
  content: string;
  projectId: string | null;
  tags: string[];
  excitement: 1 | 2 | 3 | null;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt: string | null;
  archivedAt: string | null;
}

/** A screenplay project that ideas, characters, and scenes belong to. */
export interface Project {
  id: string;
  title: string;
  logline: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
}

/** A project enriched with child aggregate counts (returned by list/get). */
export interface ProjectWithCounts extends Project {
  ideaCount: number;
  characterCount: number;
  sceneCount: number;
}

/** A character in a project's roster. */
export interface Character {
  id: string;
  projectId: string;
  name: string;
  obsession: string;
  occupation: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A scene fragment in a project's scene bank. */
export interface Scene {
  id: string;
  projectId: string;
  description: string;
  dialogueSnippet: string | null;
  position: 1 | 2 | 3 | null;
  sourceIdeaId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// API meta shapes
// ---------------------------------------------------------------------------

/** Meta block returned alongside the ideas list. */
export interface IdeasListMeta {
  total: number;
  typeCounts: Record<IdeaType | 'UNTYPED', number>;
  projectCounts: Record<string, number>;
  staleCutoffDays: 14;
}

/** Act counts returned with the scenes list. */
export interface ActCounts {
  1: number;
  2: number;
  3: number;
  unplaced: number;
  total: number;
}
