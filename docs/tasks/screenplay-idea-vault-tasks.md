# Task Plan: screenplay-idea-vault

**Created**: 2026-03-22
**Specs**: `idea-capture-and-management.md`, `projects-characters-scenes.md`
**Total tasks**: 27 (26 active + 1 deferred)
**Estimated total**: ~42h (excl. T27 AWS deployment)
**Strategy**: Local-first development — full app runs locally with no cloud dependencies until T27.

---

## T01 — Monorepo scaffold

**Layer**: Infra
**Estimate**: 1h
**Depends on**: none
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Initialize the project as a pnpm workspace monorepo with four packages: `backend` (Hono + Lambda), `frontend` (React + Vite), `infra` (CDK — populated in T27), and `shared` (domain types). Configure root `tsconfig.base.json`, ESLint, Prettier, and a root `package.json` with `build`, `test`, and `lint` scripts that run across all packages.

### Acceptance criteria
- [ ] `pnpm install` succeeds from repo root
- [ ] `pnpm -r build` compiles all packages with zero TypeScript errors
- [ ] `pnpm -r test` runs Vitest in all packages
- [ ] ESLint passes with zero warnings on the empty scaffold

### Files expected
- `package.json` — workspace root
- `pnpm-workspace.yaml`
- `packages/backend/`, `packages/frontend/`, `packages/infra/`, `packages/shared/`
- `tsconfig.base.json`
- `.eslintrc.js`, `.prettierrc`

---

## T02 — ulca local package integration

**Layer**: Config
**Estimate**: 30min
**Depends on**: T01
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Wire `~/Code/ulca` into the monorepo as a local workspace dependency for the `backend` package. Add it to `pnpm-workspace.yaml` (or use a `file:` reference in `backend/package.json`). Verify the `S3SQLiteDB`, `ETagMismatchError`, and `InsecureSecretError` exports resolve cleanly from backend code.

### Acceptance criteria
- [ ] `import { S3SQLiteDB } from 'ulca'` compiles in the backend package
- [ ] `pnpm -r build` still passes after the integration

### Files expected
- `pnpm-workspace.yaml` — updated with ulca path
- `packages/backend/package.json` — ulca dependency added

---

## T03 — Local dev environment

**Layer**: Config
**Estimate**: 1.5h
**Depends on**: T02
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Everything needed to run the full backend + frontend stack locally with zero cloud dependencies.

**Part A — `LocalFileS3Client`** (`packages/backend/src/dev/local-s3-client.ts`): Implements the three S3 methods ulca needs (`GetObject`, `PutObject`, `HeadObject`) but backed by the local filesystem under `./local-data/`. Supports the same `IfMatch`/`IfNoneMatch` conditional PUT logic as real S3 using a JSON sidecar file to track ETags. Injected in place of the real `S3Client` when `NODE_ENV=development`.

**Part B — Local dev server**: Use `@hono/node-server` to run the Hono app as a plain HTTP server on port 3000 (same app instance, no Lambda wrapper). Dev auth middleware bypass: when `NODE_ENV=development`, reads `DEV_USER_ID` from `.env.local` and injects it as the `userId` without verifying any JWT. Vite already proxies `/api → localhost:3000`.

### Acceptance criteria
- [ ] `pnpm dev:backend` starts the Hono server on port 3000 with no AWS credentials required
- [ ] `pnpm dev:frontend` starts Vite on port 5173 with `/api` proxied to the backend
- [ ] `GET /api/v1/health` returns `{ status: 'ok' }` with no JWT
- [ ] Creating an idea (once handlers exist) persists to `./local-data/*.db` and survives server restart
- [ ] `LocalFileS3Client` unit tests: GetObject, PutObject (new + existing + IfMatch mismatch), HeadObject

### Files expected
- `packages/backend/src/dev/local-s3-client.ts`
- `packages/backend/src/dev/local-s3-client.test.ts`
- `packages/backend/src/dev/server.ts`
- `.env.local.example`

---

## T04 — SQLite schema initialization

**Layer**: Repository
**Estimate**: 1h
**Depends on**: T02
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Implement the `onCreate` callback passed to `S3SQLiteDB.open()`. Executes all `CREATE TABLE` DDL from the constitution plus the columns missing from the draft schema: `updated_at TEXT NOT NULL` on `ideas`, `projects`, `characters`, and `scenes`; and `source_idea_id TEXT REFERENCES ideas(id)` on `scenes`. Export as `initSchema(db: Database.Database): void`.

### Acceptance criteria
- [ ] All 5 tables created with correct FK constraints and `ON DELETE` rules
- [ ] `updated_at` column present on `ideas`, `projects`, `characters`, `scenes`
- [ ] `source_idea_id` column present on `scenes`
- [ ] All indexes created (`idx_ideas_project`, `idx_ideas_type`, `idx_ideas_archived`, `idx_scenes_project`, `idx_chars_project`)
- [ ] Unit test: open a MockS3Client-backed DB, call `initSchema`, verify all tables and columns via `PRAGMA table_info`

### Files expected
- `packages/backend/src/db/schema.ts`
- `packages/backend/src/db/schema.test.ts`

---

## T05 — Domain types + Zod schemas

**Layer**: Types
**Estimate**: 2h
**Depends on**: T01
**Status**: DONE
**Completed**: 2026-03-22

### What to build
In `packages/shared/src/`, define all TypeScript interfaces and Zod schemas. Entities: `Idea`, `Project`, `Character`, `Scene`. Enums: `IdeaType`, `ProjectStatus`. Request body schemas: `CreateIdeaSchema`, `PatchIdeaSchema`, `CreateProjectSchema`, `PatchProjectSchema`, `CreateCharacterSchema`, `PatchCharacterSchema`, `CreateSceneSchema`, `PatchSceneSchema`. Query param schema: `ListIdeasQuerySchema` (type, projectId, q, sort, archived).

### Acceptance criteria
- [ ] All entity interfaces use camelCase field names (matching the API contract)
- [ ] Zod schemas enforce all field constraints from the spec (max lengths, enum values, integer ranges)
- [ ] `ListIdeasQuerySchema` validates all five query params with correct types and defaults
- [ ] Zero `any` types; strict mode passes

### Files expected
- `packages/shared/src/types.ts`
- `packages/shared/src/schemas.ts`
- `packages/shared/src/index.ts`

---

## T06 — IdeaRepository

**Layer**: Repository
**Estimate**: 2h
**Depends on**: T04, T05
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Implement `packages/backend/src/repositories/idea-repository.ts` with six functions. `listIdeas` builds a parameterized query supporting: type filter, projectId filter (`'unassigned'` → `IS NULL`), keyword search (`content LIKE '%' || ? || '%'`), tag search (`id IN (SELECT idea_id FROM tags WHERE tag = ?)`), archived flag, and sort order (`created_at DESC` / `type ASC` / `reviewed_at ASC NULLS FIRST`). Also runs aggregation queries for `typeCounts` (including `UNTYPED` key for null type) and `projectCounts`. `createIdea` inserts into `ideas` + `tags` in a `db.transaction()`. `getIdea` does a `LEFT JOIN tags` and groups tags into an array. `updateIdea` builds a dynamic `SET` clause from the supplied patch fields. `archiveIdea` sets `archived_at`. `restoreIdea` clears `archived_at`.

### Acceptance criteria
- [ ] `listIdeas({})` returns all non-archived ideas sorted by `created_at` DESC
- [ ] `listIdeas({ type: 'WHAT_IF' })` returns only WHAT_IF ideas
- [ ] `listIdeas({ projectId: 'unassigned' })` returns only ideas with `project_id IS NULL`
- [ ] `listIdeas({ q: 'linguist' })` matches content (case-insensitive) and tag exact match
- [ ] `listIdeas({ archived: true })` returns only archived ideas
- [ ] `typeCounts` has an `UNTYPED` key for ideas with `type IS NULL`
- [ ] `createIdea` with tags stores all tags; `getIdea` returns them as an array
- [ ] `getIdea` returns `null` for non-existent ID
- [ ] Unit tests using `MockS3Client` covering all filter combinations

### Files expected
- `packages/backend/src/repositories/idea-repository.ts`
- `packages/backend/src/repositories/idea-repository.test.ts`

---

## T07 — ProjectRepository

**Layer**: Repository
**Estimate**: 1h
**Depends on**: T04, T05
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Implement `packages/backend/src/repositories/project-repository.ts`. `listProjects` uses a single query with `LEFT JOIN` subqueries (or `COUNT` with `GROUP BY`) to return `ideaCount`, `characterCount`, `sceneCount` alongside each project, sorted by `updated_at DESC`. `createProject` inserts with `db.transaction()`. `getProject` returns the project with aggregate counts, or `null` if not found. `updateProject` sets only supplied fields plus `updated_at = now`.

### Acceptance criteria
- [ ] `listProjects` returns counts on each project row
- [ ] `updateProject` always sets `updated_at` to the current timestamp
- [ ] `getProject` returns `null` for a non-existent ID
- [ ] Unit tests using `MockS3Client`

### Files expected
- `packages/backend/src/repositories/project-repository.ts`
- `packages/backend/src/repositories/project-repository.test.ts`

---

## T08 — CharacterRepository + SceneRepository

**Layer**: Repository
**Estimate**: 2h
**Depends on**: T04, T05
**Status**: DONE
**Completed**: 2026-03-22

### What to build
`CharacterRepository`: `listCharacters(db, projectId)` sorted by `created_at`; `createCharacter`; `updateCharacter` (dynamic SET); `deleteCharacter` (permanent `DELETE`). `SceneRepository`: `listScenes(db, projectId, act?)` returns scenes filtered by optional act plus act count aggregations `{ 1: n, 2: n, 3: n, unplaced: n, total: n }`; `createScene` (stores `source_idea_id` when supplied); `updateScene`; `deleteScene` (permanent `DELETE`).

### Acceptance criteria
- [ ] `listScenes({ act: 'unplaced' })` returns only scenes with `position IS NULL`
- [ ] `listScenes({ act: 2 })` returns only scenes with `position = 2`
- [ ] Act count aggregation is always returned regardless of act filter
- [ ] `deleteCharacter` and `deleteScene` permanently remove the row
- [ ] `createScene` with `sourceIdeaId` stores it in `source_idea_id`
- [ ] Unit tests for both repositories

### Files expected
- `packages/backend/src/repositories/character-repository.ts`
- `packages/backend/src/repositories/scene-repository.ts`
- `packages/backend/src/repositories/character-repository.test.ts`
- `packages/backend/src/repositories/scene-repository.test.ts`

---

## T09 — Hono app + DB middleware + auth + health

**Layer**: Handler
**Estimate**: 2h
**Depends on**: T02, T03, T05
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Create the Hono application instance (`packages/backend/src/app.ts`) separate from the entry point so it can be shared between the local dev server and the Lambda handler. Auth middleware: in `development` mode, read `DEV_USER_ID` from env and attach as `userId`; in `production`, verify Cognito JWT (using `aws-jwt-verify`) and extract `sub`. DB middleware: call `S3SQLiteDB.open(...)` with the appropriate S3 client (real or `LocalFileS3Client` based on `NODE_ENV`), attach `db` to Hono context, call `db.flush()` + `db.close()` in a `finally` block. Health route: `GET /api/v1/health` returns `{ status: 'ok' }` without auth or DB.

Lambda entry: `packages/backend/src/index.ts` exports `handle(app)` from `@hono/aws-lambda`. Local entry: `packages/backend/src/dev/server.ts` uses `@hono/node-server`.

### Acceptance criteria
- [ ] `GET /api/v1/health` returns `{ status: 'ok' }` in both dev and Lambda modes
- [ ] Any route other than `/health` without auth returns 401 in production mode
- [ ] Dev mode injects `DEV_USER_ID` as `userId` with no JWT required
- [ ] DB is opened once per request and closed in a `finally` block regardless of errors
- [ ] Integration test: health check returns 200

### Files expected
- `packages/backend/src/app.ts`
- `packages/backend/src/middleware/auth.ts`
- `packages/backend/src/middleware/db.ts`
- `packages/backend/src/index.ts` (Lambda entry)

---

## T10 — Ideas API handlers

**Layer**: Handler
**Estimate**: 2h
**Depends on**: T06, T09
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Implement all 6 idea routes on the Hono app. Validate query params and request bodies with Zod at handler entry; return 400 on failure. When `projectId` is supplied on create/update, verify the project exists (return 404 if not). Auto-set `reviewed_at = now` when `content` or `excitement` is patched without an explicit `lastReviewedAt` in the body.

Routes: `GET /api/v1/ideas`, `POST /api/v1/ideas`, `GET /api/v1/ideas/:id`, `PATCH /api/v1/ideas/:id`, `DELETE /api/v1/ideas/:id` (soft-archive), `PATCH /api/v1/ideas/:id/restore`.

### Acceptance criteria
- [ ] `GET /ideas` returns `{ data, meta: { total, typeCounts, projectCounts, staleCutoffDays: 14 } }`
- [ ] `POST /ideas` with invalid `projectId` returns 404
- [ ] `DELETE /ideas/:id` sets `archived_at`; does not delete the row
- [ ] `GET /ideas/:id` for a non-existent ID returns 404 (not 403)
- [ ] Patching `content` without `lastReviewedAt` auto-sets `reviewed_at = now`
- [ ] Integration tests for all routes (happy path + key error cases)

### Files expected
- `packages/backend/src/handlers/ideas.ts`
- `packages/backend/src/handlers/ideas.test.ts`

---

## T11 — Projects API handlers

**Layer**: Handler
**Estimate**: 1h
**Depends on**: T07, T09
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Implement 4 project routes: `GET /api/v1/projects`, `POST /api/v1/projects`, `GET /api/v1/projects/:id`, `PATCH /api/v1/projects/:id`. Validate with Zod. All GET responses include `ideaCount`, `characterCount`, `sceneCount`.

### Acceptance criteria
- [ ] `GET /projects` returns projects sorted by `updatedAt` DESC with aggregate counts
- [ ] `POST /projects` with empty title returns 400 with `fields.title`
- [ ] `GET /projects/:id` for a non-existent ID returns 404
- [ ] Integration tests for happy path and validation errors

### Files expected
- `packages/backend/src/handlers/projects.ts`
- `packages/backend/src/handlers/projects.test.ts`

---

## T12 — Characters + Scenes API handlers

**Layer**: Handler
**Estimate**: 2h
**Depends on**: T08, T09
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Implement 10 routes: `GET /projects/:id/characters`, `POST /projects/:id/characters`, `PATCH /projects/:id/characters/:charId`, `DELETE /projects/:id/characters/:charId`, `GET /projects/:id/scenes`, `POST /projects/:id/scenes`, `PATCH /projects/:id/scenes/:sceneId`, `DELETE /projects/:id/scenes/:sceneId`. All routes verify the parent project belongs to the authenticated user (404 if not). Both DELETEs return 204 No Content.

### Acceptance criteria
- [ ] `GET /projects/:id/scenes` returns `{ data, meta: { actCounts } }`
- [ ] `GET /projects/:id/scenes?act=unplaced` returns only unplaced scenes
- [ ] `DELETE /characters/:id` returns 204 and the row is permanently gone
- [ ] Project belonging to another user returns 404 on all nested routes
- [ ] Integration tests for all 10 routes

### Files expected
- `packages/backend/src/handlers/characters.ts`
- `packages/backend/src/handlers/scenes.ts`
- `packages/backend/src/handlers/characters.test.ts`
- `packages/backend/src/handlers/scenes.test.ts`

---

## T13 — Frontend scaffold

**Layer**: UI
**Estimate**: 1h
**Depends on**: T05
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Initialize `packages/frontend` as a Vite + React 18 + TypeScript (strict) project. Install and configure: Tailwind CSS, React Router v6, TanStack Query v5, Zustand, Vitest + Testing Library, AWS Amplify. Configure `vite.config.ts` with a `/api` proxy to `localhost:3000` for local dev.

### Acceptance criteria
- [ ] `pnpm dev` starts the dev server on port 5173
- [ ] `pnpm build` produces a production bundle with zero TypeScript errors
- [ ] `pnpm test` runs Vitest

### Files expected
- `packages/frontend/vite.config.ts`
- `packages/frontend/tailwind.config.ts`
- `packages/frontend/src/main.tsx`

---

## T14 — Auth flow (lightweight PKCE + Cognito, deferred until deployment)

**Layer**: UI
**Estimate**: 1h
**Depends on**: T13, T27
**Status**: DEFERRED

### What to build
No Amplify. Implement a minimal PKCE OAuth 2.0 flow against the Cognito hosted UI using plain `fetch` (~50 lines). `<AuthProvider>` checks `localStorage` for a valid access token on mount and initiates the Cognito redirect if absent. Token refresh via the Cognito token endpoint. Auth Zustand slice: `{ idToken, isAuthenticated }`. In local dev (no `VITE_COGNITO_DOMAIN` set), skip auth entirely — the API client omits the Authorization header and the backend dev middleware accepts all requests.

### Acceptance criteria
- [ ] In dev mode (no `VITE_COGNITO_DOMAIN`), the app loads directly to `/ideas` with no login prompt
- [ ] In prod mode, unauthenticated users are redirected to Cognito hosted UI
- [ ] Token expiry in prod triggers a silent refresh, or re-redirects on failure
- [ ] No `aws-amplify` dependency

### Files expected
- `packages/frontend/src/auth/AuthProvider.tsx`
- `packages/frontend/src/auth/ProtectedRoute.tsx`
- `packages/frontend/src/store/auth-store.ts`

---

## T15 — App shell (layout, navigation, routing)

**Layer**: UI
**Estimate**: 2h
**Depends on**: T14
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Persistent app shell: top navigation bar with app name and FAB (+) button (placeholder action for now), left sidebar with Inbox section (All Ideas, Stale, Raw/Untyped, Archived) and Projects section (project links + "+ New Project"). React Router routes: `/ideas`, `/ideas/:id`, `/projects`, `/projects/:id`. `<Breadcrumb>` component. Toast provider (`react-hot-toast`).

### Acceptance criteria
- [ ] FAB is visible on all authenticated screens
- [ ] Sidebar Inbox links navigate to `/ideas` with the appropriate filter pre-applied in the URL
- [ ] Breadcrumb renders "Ideas › [content]" on `/ideas/:id`
- [ ] Toast provider is available app-wide

### Files expected
- `packages/frontend/src/layout/AppShell.tsx`
- `packages/frontend/src/layout/Sidebar.tsx`
- `packages/frontend/src/layout/TopNav.tsx`
- `packages/frontend/src/components/Breadcrumb.tsx`
- `packages/frontend/src/router.tsx`

---

## T16 — API client + React Query hooks

**Layer**: UI
**Estimate**: 1h
**Depends on**: T05, T13
**Status**: DONE
**Completed**: 2026-03-22

### What to build
Typed `apiClient` fetch wrapper that injects the `idToken` and handles 401 (Amplify signOut + redirect). React Query hooks for every endpoint: `useIdeas`, `useIdea`, `useCreateIdea`, `usePatchIdea`, `useArchiveIdea`, `useRestoreIdea`, `useProjects`, `useProject`, `useCreateProject`, `usePatchProject`, `useCharacters`, `useCreateCharacter`, `usePatchCharacter`, `useDeleteCharacter`, `useScenes`, `useCreateScene`, `usePatchScene`, `useDeleteScene`. Mutation hooks invalidate the relevant query keys on success.

### Acceptance criteria
- [ ] All hooks use the correct HTTP methods and paths from the spec
- [ ] Mutation success invalidates related queries (e.g. `useCreateIdea` invalidates `['ideas']`)
- [ ] A 401 response triggers sign-out and redirect

### Files expected
- `packages/frontend/src/api/client.ts`
- `packages/frontend/src/api/hooks/ideas.ts`
- `packages/frontend/src/api/hooks/projects.ts`
- `packages/frontend/src/api/hooks/characters.ts`
- `packages/frontend/src/api/hooks/scenes.ts`

---

## T17 — Quick Capture Modal

**Layer**: UI
**Estimate**: 2h
**Depends on**: T16, T15
**Status**: DONE
**Completed**: 2026-03-23

### What to build
Quick Capture Modal component. FAB and `N` keyboard shortcut (guarded: no-op if focus is in a text input) open the modal. Contents: 8-option type pill row (No type yet default, dashed style), content textarea (autofocus), project selector (hidden if no projects), tags input (comma-delimited → split to array). Save disabled while content is empty. On success: close modal, toast "Idea saved" with View link. On 5xx: keep modal open, preserve content, show error toast. Escape / backdrop click dismisses without saving. Modal state in Zustand (`quick-capture-store.ts`) so any component can open it with pre-filled content.

### Acceptance criteria
- [ ] All Quick Capture acceptance criteria from the spec pass
- [ ] `N` shortcut does not fire when a text input has focus
- [ ] Selecting "No type yet" saves idea with `type: null`
- [ ] Comma-separated tags are split and stored as individual items
- [ ] 5xx error keeps modal open with content intact

### Files expected
- `packages/frontend/src/components/QuickCaptureModal.tsx`
- `packages/frontend/src/store/quick-capture-store.ts`

---

## T18 — Ideas List page + filtering

**Layer**: UI
**Estimate**: 2h
**Depends on**: T17
**Status**: DONE
**Completed**: 2026-03-23

### What to build
`/ideas` page. Type filter sidebar driven by `typeCounts` from the API response. Project filter sidebar driven by `projectCounts`. Search input with 300ms debounce. Sort selector (Most recent / Type / Last reviewed). Active filter chips with individual ✕ and "Clear all". Result count display ("N ideas" / "N of M [Type] ideas match '[term]'"). Empty state with CTA: opens Quick Capture Modal with the search term pre-filled. Filter state reflected in URL query params.

### Acceptance criteria
- [ ] All Ideas List acceptance criteria from the spec pass
- [ ] Active filters appear as removable chips
- [ ] Empty search results show CTA that opens Quick Capture with the term pre-filled
- [ ] URL query params reflect active filters (bookmarkable)

### Files expected
- `packages/frontend/src/pages/IdeasListPage.tsx`
- `packages/frontend/src/hooks/useIdeasFilters.ts`

---

## T19 — Idea cards

**Layer**: UI
**Estimate**: 1h
**Depends on**: T18
**Status**: DONE
**Completed**: 2026-03-23

### What to build
`<IdeaCard>` component (reused on Ideas List and Project Ideas Tab). Shows: type badge, content (1-line truncated), tags, project name, date added, excitement dots (3 dots: filled = rated, dashed = unrated). Stale indicator: solid left border accent + age badge when `lastReviewedAt > 14 days` ago, or `createdAt > 14 days` ago and `lastReviewedAt` is null. Raw/untyped indicator: dashed left border + dashed "UNTYPED" badge when `type === null`. ⋯ overflow menu: View/Edit, Assign to project…, Archive idea (red, below divider). WHAT_IF ideas include "Promote to Scene…" (implemented in T26).

### Acceptance criteria
- [ ] All Stale & Raw Indicators acceptance criteria from the spec pass
- [ ] Excitement dots correctly show filled state for ratings 1, 2, 3
- [ ] Overflow "Archive idea" calls `useArchiveIdea` and shows undo toast (5s)

### Files expected
- `packages/frontend/src/components/IdeaCard.tsx`

---

## T20 — Idea Detail page

**Layer**: UI
**Estimate**: 4h
**Depends on**: T19, T16
**Status**: DONE
**Completed**: 2026-03-23

### What to build
`/ideas/:ideaId` page. Main area: full content with inline edit (`<InlineEdit>` — click → textarea, `⌘+Enter` saves, `Esc` cancels; saving sets `reviewed_at = now`). Tags inline edit (✕ per tag, + add tag, save on blur/Enter). Stale banner (when stale) + "Mark as reviewed" link. Raw banner (when untyped) + "Set type now". Breadcrumb with ‹ › prev/next arrows (preserves filter/sort context from Ideas List). Right sidebar: excitement widget (3 clickable dots; same dot again → clear to null; sets `reviewed_at = now`), project dropdown, type dropdown, creation date, last-reviewed date. Danger zone: "Archive idea…" → sets `archivedAt`, navigate to `/ideas`, show "Idea archived — Undo" toast (5s calls restoreIdea).

### Acceptance criteria
- [ ] All Idea Detail acceptance criteria from the spec pass
- [ ] `⌘+Enter` saves inline edit; `Esc` cancels without saving
- [ ] Clicking the same excitement dot again clears the rating to null
- [ ] ‹ › arrows step within the last active filter/sort context
- [ ] Undo within 5s restores the idea and removes the toast

### Files expected
- `packages/frontend/src/pages/IdeaDetailPage.tsx`
- `packages/frontend/src/components/ExcitementWidget.tsx`
- `packages/frontend/src/components/InlineEdit.tsx`

---

## T21 — Projects List + Create Project Modal

**Layer**: UI
**Estimate**: 1h
**Depends on**: T16, T15
**Status**: DONE
**Completed**: 2026-03-26

### What to build
`/projects` page. Project rows showing title, status badge, truncated logline, idea/character/scene counts, last-updated date. "+ New Project" opens the Create Project Modal (title required, logline optional, status selector — 3 options, default DEVELOPING). On create success, navigate to the new project's dashboard.

### Acceptance criteria
- [ ] All Projects List acceptance criteria from the spec pass
- [ ] Create Project with empty title shows "Title is required" inline error
- [ ] After creation, browser navigates to `/projects/:id`

### Files expected
- `packages/frontend/src/pages/ProjectsListPage.tsx`
- `packages/frontend/src/components/CreateProjectModal.tsx`

---

## T22 — Project Dashboard shell

**Layer**: UI
**Estimate**: 1h
**Depends on**: T21
**Status**: DONE
**Completed**: 2026-03-26

### What to build
`/projects/:id` shell. Header: project title, status badge, logline editable inline via `<InlineEdit>` (renders "No logline yet — add one" when empty), "Edit project" button → Edit Project Modal (same form as Create, pre-filled). Three tabs with counts: Ideas (default), Characters, Scenes. Breadcrumb: "Projects › [title]". Project not found → full-page error with link back to `/projects`.

### Acceptance criteria
- [ ] All Project Dashboard acceptance criteria from the spec pass
- [ ] Logline renders as a tap target "No logline yet — add one" when null
- [ ] Inline logline save PATCHes the project and updates the header without a page reload

### Files expected
- `packages/frontend/src/pages/ProjectDashboardPage.tsx`
- `packages/frontend/src/components/EditProjectModal.tsx`

---

## T23 — Ideas Tab + Assign Drawer

**Layer**: UI
**Estimate**: 2h
**Depends on**: T22, T19
**Status**: DONE
**Completed**: 2026-03-26

### What to build
The Ideas Tab inside the Project Dashboard. Reuses `<IdeaCard>`. Toolbar: search (filters within this project's ideas), "Assign existing idea" button, "+ Capture new idea" button. "+ Capture new idea" opens Quick Capture Modal with this project's `projectId` pre-selected and locked. "Assign existing idea" opens a right-side drawer: lists all ideas not assigned to this project (unassigned first, then other-project ideas labelled), keyword search, multi-select checkboxes, CTA "Assign N idea(s)". On confirm: PATCH each selected idea's `projectId`.

### Acceptance criteria
- [ ] All Ideas Tab acceptance criteria from the spec pass
- [ ] Quick Capture opened from here locks the project selector
- [ ] Assign drawer CTA updates label dynamically with selection count
- [ ] After assigning, tab count increments and drawer closes

### Files expected
- `packages/frontend/src/components/ProjectIdeasTab.tsx`
- `packages/frontend/src/components/AssignIdeaDrawer.tsx`

---

## T24 — Characters Tab

**Layer**: UI
**Estimate**: 2h
**Depends on**: T22
**Status**: DONE
**Completed**: 2026-03-27

### What to build
The Characters Tab. Responsive card grid (min ~220px). Character card: name (heading), obsession (labelled "Obsession — what drives them"), occupation, edit icon. Dashed "+" placeholder card at end of grid as persistent add trigger. Add Character Modal: name, obsession, occupation (all required), notes (optional). Edit Character Modal: same fields + "Delete character…" danger link with inline confirmation ("Delete [name]? This cannot be undone." → Delete (red) + Cancel).

### Acceptance criteria
- [ ] All Characters Tab acceptance criteria from the spec pass
- [ ] Obsession field label reads exactly "Obsession — what drives them"
- [ ] After adding, new card appears and tab count increments
- [ ] Delete requires a confirmation step before executing

### Files expected
- `packages/frontend/src/components/ProjectCharactersTab.tsx`
- `packages/frontend/src/components/CharacterModal.tsx`

---

## T25 — Scenes Tab (Scene Bank)

**Layer**: UI
**Estimate**: 2h
**Depends on**: T22
**Status**: DONE
**Completed**: 2026-03-27

### What to build
The Scenes Tab. Act filter pill row: All, Act 1, Act 2, Act 3, Unplaced — each showing a count. Scene cards: full description (not truncated), dialogue snippet (indented italic + left border accent when present), act badge (top-right). Dashed "UNPLACED" badge + dashed left border for `position === null` scenes. "+ Add scene" opens Add Scene Modal: description (required, with helper text "Action line only — no internal thought, no prose." and placeholder `INT. / EXT. LOCATION — TIME. Action. What happens.`), dialogue snippet (optional), act position 4-way pill (Not placed yet / Act 1 / Act 2 / Act 3). Edit Scene Modal: same fields + "Delete this scene…" danger link (permanent, with inline confirmation).

### Acceptance criteria
- [ ] All Scenes Tab acceptance criteria from the spec pass
- [ ] Description placeholder reads exactly `INT. / EXT. LOCATION — TIME. Action. What happens.`
- [ ] Unplaced scenes show dashed UNPLACED badge and dashed left border
- [ ] Delete requires confirmation before permanent removal

### Files expected
- `packages/frontend/src/components/ProjectScenesTab.tsx`
- `packages/frontend/src/components/SceneModal.tsx`

---

## T26 — What-If → Scene promotion *(COULD)*

**Layer**: UI
**Estimate**: 2h
**Depends on**: T25, T19
**Status**: DONE
**Completed**: 2026-03-28

### What to build
Add "Promote to Scene…" to the ⋯ overflow menu on WHAT_IF idea cards (Ideas List and Project Ideas Tab). If idea has no project, show disabled option with tooltip "Assign to a project first." Otherwise open Promote to Scene Modal: title "Promote to Scene — from What-If idea", source idea banner, description pre-filled from idea content, dialogue snippet (optional), act position selector, checkbox "Archive the original What-If idea after saving" (unchecked by default). On save: `POST /projects/:id/scenes` with `sourceIdeaId`, then optionally `DELETE /ideas/:id` if checkbox checked.

### Acceptance criteria
- [ ] All What-If Promotion acceptance criteria from the spec pass
- [ ] Option only appears on WHAT_IF ideas
- [ ] Idea with no project shows disabled option with tooltip
- [ ] Created scene has `sourceIdeaId` set correctly
- [ ] Archive checkbox correctly archives the source idea on save

### Files expected
- `packages/frontend/src/components/PromoteToSceneModal.tsx`
- `packages/frontend/src/components/IdeaCard.tsx` (updated)

---

## T27 — AWS deployment *(DEFERRED — deploy phase)*

**Layer**: Infra
**Estimate**: 4h
**Depends on**: T01–T26 (app fully working locally)
**Status**: DEFERRED

### What to build
CDK stack in `packages/infra/`: S3 bucket for DB objects (`screenplay-vault-db-{env}`, no public access), S3 bucket for frontend (`screenplay-vault-frontend-{env}`), Cognito User Pool + App Client (hosted UI), Lambda function (ARM64 Node 22.x, esbuild bundled, reserved concurrency = 1), API Gateway v2 HTTP API (Cognito JWT authorizer), CloudFront distribution (frontend via OAC + `/api/*` passthrough to API GW), SSM Parameter for `db-hmac-secret`. Lambda entry point: `packages/backend/src/index.ts` using `handle(app)` from `@hono/aws-lambda` — same Hono app, different adapter.

### Acceptance criteria
- [ ] `cdk synth` produces a valid CloudFormation template
- [ ] Lambda reserved concurrency = 1 is declared
- [ ] S3 DB bucket blocks all public access
- [ ] API Gateway authorizer references the Cognito User Pool
- [ ] `cdk deploy` succeeds and the app is accessible at the CloudFront URL

### Files expected
- `packages/infra/bin/app.ts`
- `packages/infra/lib/screenplay-vault-stack.ts`
- `packages/infra/cdk.json`

---

## Summary

| Phase | Tasks | Estimate |
|---|---|---|
| Scaffold & Local Dev | T01–T03 | ~3h |
| DB Schema | T04 | ~1h |
| Types | T05 | ~2h |
| Repository Layer | T06–T08 | ~5h |
| API Foundation | T09 | ~2h |
| API Handlers | T10–T12 | ~5h |
| Frontend Foundation | T13–T16 | ~5h |
| Frontend — Ideas | T17–T20 | ~9h |
| Frontend — Projects | T21–T25 | ~8h |
| COULD: What-If Promotion | T26 | ~2h |
| **Total (local build)** | **26 tasks** | **~42h** |
| DEFERRED: AWS Deploy | T27 | ~4h |
