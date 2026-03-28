# Constitution

> Immutable context for all AI operations. Changes require deliberate architectural decisions. Do not edit during feature implementation.

## Project Identity

- **Name**: screenplay-idea-vault
- **Description**: A personal idea vault for capturing, organizing, and developing screenplay ideas — built around proven fiction craft frameworks.
- **Started**: 2026-03-21
- **Owner**: Peter

## Technology Stack

### Frontend
- **Framework**: React 18 + Vite
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State**: React Query (server state) + Zustand (UI state)
- **Testing**: Vitest + Testing Library

### Backend
- **Runtime**: Node.js 22.x (AWS Lambda)
- **Language**: TypeScript
- **HTTP Framework**: Hono (lightweight, Lambda-native)
- **Validation**: Zod (all boundary inputs)
- **Testing**: Vitest + `MockS3Client` (from `ulca/tests/MockS3.ts` — no Docker needed for unit tests)

### Data Layer
- **Primary Database**: SQLite per user, stored as a single S3 object via `ulca` (`S3SQLiteDB`)
- **Storage Backend**: S3 (one `.db` object per user; also used for future file attachments)
- **DB Package**: `ulca` — local TypeScript package at `~/Code/ulca` (`S3SQLiteDB` class)
- **Concurrency model**: Lambda reserved concurrency = 1 per user; ETag-conditional PUT guards against races

### Infrastructure
- **Cloud**: AWS
- **IaC**: AWS CDK (TypeScript)
- **Hosting**: S3 + CloudFront (React/Vite static build)
- **Auth**: Cognito User Pool (single user — personal tool)
- **CI/CD**: GitHub Actions with OIDC

## Architecture Layers

Dependencies flow forward only. No skipping layers. No circular dependencies.

```
Types → Config → Repository → Service → Handler → API → UI
```

- **Types**: Zod schemas, TypeScript interfaces, enums (IdeaType, ProjectStatus, etc.)
- **Config**: Environment variables, constants, feature flags
- **Repository**: All `S3SQLiteDB` I/O. Opens the user's DB, executes SQL, flushes. No business logic.
- **Service**: Business logic. No HTTP context. No direct DB calls.
- **Handler**: Lambda entry points. Calls services. Returns HTTP responses.
- **API**: API Gateway v2 routes and authorizers
- **UI**: React components, pages, hooks

## Domain Model (initial)

```
Idea
  id: string (UUID)
  type: IdeaType (WHAT_IF | CHARACTER | SETTING | FIRST_LINE | SCENE | THEME | NEWS_FLASH)
  content: string
  projectId?: string
  tags: string[]
  createdAt: string (ISO 8601)
  lastReviewedAt?: string
  excitement: 1 | 2 | 3  (how exciting it still feels)

Project (Screenplay)
  id: string
  title: string
  logline?: string
  status: DEVELOPING | ACTIVE | SHELVED

Character
  id: string
  projectId: string
  name: string
  obsession: string
  occupation: string
  notes: string

Scene
  id: string
  projectId: string
  description: string  // action line, not prose
  dialogueSnippet?: string
  position?: number    // rough act placement: 1 | 2 | 3
```

## SQLite Schema

Each user owns one SQLite database stored as `dbs/<hmac-hex>.db` on S3.
Opened per Lambda invocation via `S3SQLiteDB.open()` from the `ulca` package.
`journal_mode = DELETE` (no WAL) keeps the database a single portable file.

```sql
CREATE TABLE ideas (
  id           TEXT PRIMARY KEY,          -- UUID v4
  type         TEXT,                      -- WHAT_IF | CHARACTER | SETTING |
                                          -- FIRST_LINE | SCENE | THEME | NEWS_FLASH | NULL
  content      TEXT    NOT NULL,
  project_id   TEXT    REFERENCES projects(id) ON DELETE SET NULL,
  excitement   INTEGER CHECK (excitement IN (1,2,3)),
  archived_at  TEXT,                      -- ISO 8601; NULL = active
  created_at   TEXT    NOT NULL,          -- ISO 8601
  updated_at   TEXT    NOT NULL,          -- ISO 8601; updated on every write
  reviewed_at  TEXT                       -- ISO 8601; last review timestamp
);

CREATE TABLE tags (
  idea_id  TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  tag      TEXT NOT NULL,
  PRIMARY KEY (idea_id, tag)
);

CREATE TABLE projects (
  id         TEXT PRIMARY KEY,
  title      TEXT NOT NULL,
  logline    TEXT,
  status     TEXT NOT NULL DEFAULT 'DEVELOPING'
             CHECK (status IN ('DEVELOPING','ACTIVE','SHELVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL                -- ISO 8601; updated on every write
);

CREATE TABLE characters (
  id         TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  obsession  TEXT NOT NULL,
  occupation TEXT NOT NULL,
  notes      TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL                -- ISO 8601
);

CREATE TABLE scenes (
  id               TEXT PRIMARY KEY,
  project_id       TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  description      TEXT NOT NULL,   -- action line, not prose
  dialogue_snippet TEXT,
  position         INTEGER,         -- act placement: 1 | 2 | 3
  source_idea_id   TEXT REFERENCES ideas(id) ON DELETE SET NULL,  -- set when promoted from WHAT_IF
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL    -- ISO 8601
);

-- Useful indexes (add as query patterns emerge)
CREATE INDEX IF NOT EXISTS idx_ideas_project   ON ideas(project_id);
CREATE INDEX IF NOT EXISTS idx_ideas_type      ON ideas(type);
CREATE INDEX IF NOT EXISTS idx_ideas_archived  ON ideas(archived_at);
CREATE INDEX IF NOT EXISTS idx_scenes_project  ON scenes(project_id);
CREATE INDEX IF NOT EXISTS idx_chars_project   ON characters(project_id);
```

### S3 Object Key

```
dbs/<HMAC-SHA256(DB_HMAC_SECRET, "v1:<cognitoSub>")>.db
```

- `namespace = "v1"`, `id = cognitoSub` (the Cognito user's `sub` claim)
- Secret stored in AWS SSM Parameter Store as `/screenplay-vault/{env}/db-hmac-secret`
- Lambda reserved concurrency = 1 per deployment (single user tool — trivially satisfied)

## Coding Standards

- TypeScript strict mode: `"strict": true`
- No `any` types
- Explicit return types on all exported functions
- Structured logging: `{ level, message, ...context }` — not console.log strings
- No secrets in code — use AWS SSM Parameter Store

## Naming Conventions

- **Files/Directories**: kebab-case
- **Types/Interfaces**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE
- **S3 Bucket**: `screenplay-vault-db-{env}` (database objects) / `screenplay-vault-assets-{env}` (future files)
- **Lambda Functions**: `screenplay-vault-{resource}-{action}-{env}`

## Security Rules

- All API inputs validated with Zod at the handler layer
- Cognito JWT required on all routes except health check
- CORS restricted to CloudFront distribution URL (prod) or localhost:5173 (dev)
- No PII in CloudWatch logs

## Definition of Done

- [ ] Implementation matches spec acceptance criteria
- [ ] TypeScript compiles with zero errors
- [ ] ESLint passes with zero warnings
- [ ] Relevant tests written and passing
- [ ] Deployed to dev and smoke-tested
