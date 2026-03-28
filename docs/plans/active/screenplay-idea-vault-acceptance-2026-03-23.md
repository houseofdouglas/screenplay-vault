# Acceptance Report: screenplay-idea-vault
Date: 2026-03-23
Result: **PARTIAL**

## Summary

115 criteria checked across both specs.
- **48 PASS** — backend fully implemented; Quick Capture, Ideas List, and core infrastructure done
- **5 PARTIAL** — implemented but with gaps
- **62 FAIL** — T19–T26 frontend pages not yet built (IdeaCard, Idea Detail, Projects, Characters, Scenes, What-If Promotion)

Tasks remaining: T19, T20, T21, T22, T23, T24, T25, T26 (T14 auth and T27 deployment deferred).

---

## Criteria Results — idea-capture-and-management.md

### Quick Capture — Happy Path

#### ✅ PASS — FAB opens Quick Capture Modal without navigating
Evidence: `AppShell.tsx` → `handleFabClick` calls `openModal()`; `TopNav.tsx` renders FAB

#### ✅ PASS — `N` shortcut opens modal (unless focus is in a text input)
Evidence: `AppShell.tsx` keydown handler; tag/input/textarea/contenteditable guard; tested in `QuickCaptureModal.test.tsx`

#### ✅ PASS — Content textarea autofocuses when modal opens
Evidence: `QuickCaptureModal.tsx` — `requestAnimationFrame(() => textareaRef.current?.focus())`

#### ✅ PASS — Save button disabled when content is empty
Evidence: `QuickCaptureModal.test.tsx` — "Save button is disabled when content is empty"

#### ✅ PASS — Save with only content calls POST /api/v1/ideas
Evidence: `useCreateIdea` → `POST /ideas`; tested in `QuickCaptureModal.test.tsx`

#### ✅ PASS — After save: modal closes, toast "Idea saved" with View link
Evidence: `QuickCaptureModal.tsx` `handleSubmit` → `toast.success(...)` with `<Link to="/ideas/${result.data.id}">View</Link>`; tested

#### ✅ PASS — "View" link navigates to `/ideas/:ideaId`
Evidence: `QuickCaptureModal.tsx` — Link component in toast callback; tested

#### ✅ PASS — Type pill saves idea with that type
Evidence: `QuickCaptureModal.test.tsx` — "passes the selected type to createIdea"

#### ✅ PASS — "No type yet" saves with `type: null` (sent as `undefined`)
Evidence: `QuickCaptureModal.test.tsx` — "calls createIdea with type: undefined when 'No type yet' is selected"

#### ✅ PASS — Project at capture stores `projectId`
Evidence: `QuickCaptureModal.tsx` — project dropdown feeds into `createIdea.mutateAsync({ projectId })`

#### ✅ PASS — Comma-separated tags stored as individual items
Evidence: `QuickCaptureModal.test.tsx` — "splits comma-separated tags into an array"

---

### Quick Capture — Error Handling

#### ✅ PASS — 5xx: modal stays open, content preserved, error toast shown
Evidence: `QuickCaptureModal.test.tsx` — "keeps modal open and shows error toast on failure"

#### ✅ PASS — Escape dismisses modal without creating idea
Evidence: `QuickCaptureModal.test.tsx` — "Escape key closes the modal"

#### ✅ PASS — Backdrop click dismisses modal without creating idea
Evidence: `QuickCaptureModal.test.tsx` — "clicking the backdrop closes the modal"

---

### Ideas List

#### ⚠️ PARTIAL — `/ideas` loads in under 2 seconds
Gap: No automated performance test. Architecture (local SQLite, Hono, no cloud cold-start in dev) is consistent with this goal, but no benchmark exists.
Suggestion: Add a Playwright test measuring Time to Interactive once the backend is running.

#### ✅ PASS — Default view shows all non-archived ideas sorted by `createdAt` DESC
Evidence: `IdeasListPage.tsx` — default `apiParams` has `sort: 'recent'`, `archived: 'false'`; backend `listIdeas` defaults confirmed in `idea-repository.test.ts`

#### ⚠️ PARTIAL — Type filter in sidebar filters list; counts update when other filters active
Gap: The filter sidebar shows counts from the current API response `meta.typeCounts`. However, counts reflect the **full** dataset query (backend returns typeCounts for all non-archived ideas), not the filtered subset. If you filter by project, the type counts still show totals, not counts-within-project.
Suggestion: Backend `listIdeas` could return `typeCounts` scoped to the current projectId/q filters; or accept this as a known simplification for v1.

#### ✅ PASS — "Unassigned" project filter shows only ideas with `projectId === null`
Evidence: `IdeasListPage.tsx` sets `projectId: 'unassigned'`; `idea-repository.ts` `listIdeas` handles `'unassigned'` → `IS NULL`; repository test confirms

#### ✅ PASS — Search with 300ms debounce
Evidence: `useIdeasFilters.ts` — `setTimeout(..., 300)` in debounce effect; hook tested in `useIdeasFilters.test.ts`

#### ✅ PASS — Search matches content and tags
Evidence: Backend `idea-repository.ts` `listIdeas` — `content LIKE '%' || ? || '%'` + `id IN (SELECT idea_id FROM tags WHERE tag = ?)` for q param; repository test covers both

#### ✅ PASS — Active filter chips appear for each active filter
Evidence: `IdeasListPage.tsx` — `chips` array built from active filters; rendered as `<FilterChip>` components

#### ✅ PASS — Clicking ✕ on a chip removes that single filter
Evidence: `IdeasListPage.tsx` — each chip's `onRemove` calls the specific setter; hook setter clears just that param

#### ✅ PASS — "Clear all" removes all active filters
Evidence: `IdeasListPage.tsx` — `clearFilters()` called; `useIdeasFilters.test.ts` — "resets all filters to defaults"

#### ✅ PASS — Result count displays correctly
Evidence: `IdeasListPage.tsx` — `resultLabel` logic builds "N ideas" / "N of M [Type] ideas match '[term]'"

#### ✅ PASS — Zero results shows CTA to capture search term as idea
Evidence: `IdeasListPage.tsx` — empty state renders "+ Capture '[term]' as idea" button when `filters.q` is set

#### ✅ PASS — No-results CTA opens Quick Capture with term pre-filled
Evidence: `IdeasListPage.tsx` — `openModal({ content: filters.q })` on CTA click

---

### Stale & Raw Indicators

#### ✅ PASS — Idea with `lastReviewedAt` > 14 days shows stale indicator
Evidence: `IdeasListPage.tsx` `isStale()` helper — checks `lastReviewedAt` timestamp vs 14-day cutoff; renders left border accent + age badge

#### ✅ PASS — Idea with `lastReviewedAt === null` and `createdAt` > 14 days shows stale
Evidence: `IdeasListPage.tsx` `isStale()` — falls back to `createdAt` when `lastReviewedAt` is null

#### ✅ PASS — `type === null` shows dashed UNTYPED badge and dashed left border
Evidence: `IdeasListPage.tsx` `IdeaRow` — renders `border-dashed border-l-gray-300` and "UNTYPED" badge when `idea.type === null`

#### ⚠️ PARTIAL — "Stale ideas" sidebar link filters list to stale ideas only
Gap: `Sidebar.tsx` links to `/ideas?sort=last_reviewed` which **sorts** by lastReviewedAt (nulls first) but does not **filter** to only stale ideas. Non-stale ideas still appear, just sorted lower.
Suggestion: Backend needs a `stale=true` query param, or implement client-side filtering for `staleDays > 14`. This is a design gap — the spec requires filtering, not just sorting.

#### ✅ PASS — "Raw / untyped" sidebar link filters to untyped ideas
Evidence: `Sidebar.tsx` → `to="/ideas?type=untyped"`; `IdeasListPage.tsx` handles `type=untyped` via client-side filter

---

### Idea Detail (T20 — PENDING)

#### ❌ FAIL — `/ideas/:ideaId` shows full idea content, type, tags, project, excitement, dates
Reason: `IdeaDetailPage.tsx` is a placeholder stub ("coming in T20")

#### ❌ FAIL — Inline editing of content (click → textarea, ⌘+Enter saves, Esc cancels)
Reason: Not implemented (T20)

#### ❌ FAIL — After inline save, `updatedAt` and `lastReviewedAt` update to now
Reason: Not implemented (T20)

#### ❌ FAIL — Stale banner visible with "Mark as reviewed" link
Reason: Not implemented (T20)

#### ❌ FAIL — Raw banner with "Set type now" link
Reason: Not implemented (T20)

#### ❌ FAIL — Excitement dot click sets rating; same dot clears to null
Reason: Not implemented (T20)

#### ❌ FAIL — Updating excitement sets `lastReviewedAt = now`
Reason: Not implemented (T20)

#### ❌ FAIL — Project dropdown PATCHes `projectId`
Reason: Not implemented (T20)

#### ❌ FAIL — Type dropdown PATCHes `type`
Reason: Not implemented (T20)

#### ❌ FAIL — ‹ › arrows step through list in current filter context
Reason: Not implemented (T20)

#### ❌ FAIL — "Archive idea…" sets `archivedAt`, navigates, shows undo toast (5s)
Reason: Not implemented (T20)

#### ❌ FAIL — Undo within 5s restores idea
Reason: Not implemented (T20)

#### ❌ FAIL — Tags inline editable (✕ per tag, + add tag)
Reason: Not implemented (T20)

#### ❌ FAIL — Activity history log (captured, type set, project assigned, etc.)
Reason: Not implemented (T20). Note: no `activity_log` table in schema — this will require either deriving events from existing timestamps or adding a new table.

---

### Archive

#### ✅ PASS — Archived ideas hidden from default Ideas List
Evidence: `IdeasListPage.tsx` default `archived: 'false'`; backend excludes `archived_at IS NOT NULL` by default; backend tests confirm

#### ✅ PASS — "Archived" sidebar Inbox link shows only archived ideas
Evidence: `Sidebar.tsx` → `to="/ideas?archived=true"`; frontend reads this param; backend filters by `archived_at IS NOT NULL`

#### ❌ FAIL — Archived idea's detail page shows "This idea is archived" banner with Restore button
Reason: IdeaDetailPage is a stub (T20)

#### ❌ FAIL — Restore button calls `PATCH /ideas/:ideaId/restore` and removes banner
Reason: IdeaDetailPage is a stub (T20)

---

### Security

#### ✅ PASS — `GET /ideas` returns only requesting user's ideas
Evidence: Database is per-user (S3 key derived from HMAC of userId); structural isolation — no SQL `WHERE userId = ?` needed

#### ✅ PASS — `GET /ideas/:ideaId` for different user returns 404 (not 403)
Evidence: `handlers/ideas.ts` — `getIdea` returns null → 404 response; tested in `ideas.test.ts`

#### ✅ PASS — Without valid JWT returns 401
Evidence: `middleware/auth.ts`; `app.test.ts` — "returns 401 when Authorization header is missing"

#### ✅ PASS — `userId` never accepted from request body
Evidence: All handlers derive userId from `c.get('userId')` (set by auth middleware from JWT); no request body parsing for userId

#### ✅ PASS — No user content in CloudWatch logs
Evidence: Grep across `middleware/` and `handlers/` — no `content`, `tags`, or user fields appear in log statements; handlers log only `ideaId`, `projectId`, level, message

---

### Validation

#### ✅ PASS — `POST /ideas` empty `content` returns 400 with `fields.content`
Evidence: `CreateIdeaSchema` `content: z.string().min(1)`; handler tests confirm 400 with field error

#### ✅ PASS — `POST /ideas` content > 2000 chars returns 400
Evidence: `CreateIdeaSchema` `.max(2000)`; handler tests confirm

#### ✅ PASS — `POST /ideas` invalid `type` returns 400
Evidence: `CreateIdeaSchema` `ideaTypeEnum` validation; handler tests confirm

#### ✅ PASS — `POST /ideas` with `projectId` not owned returns 404
Evidence: `handlers/ideas.ts` — project existence check before insert; `ideas.test.ts` confirms

#### ✅ PASS — Tag > 50 characters returns 400
Evidence: `schemas.ts` `tagItem: z.string().max(50)`

#### ✅ PASS — More than 20 tags returns 400
Evidence: `schemas.ts` `tagsArray: z.array(tagItem).max(20)`

---

## Criteria Results — projects-characters-scenes.md

### Idea Card (T19 — PENDING)

#### ❌ FAIL — Cards show overflow menu (View/Edit, Assign to project, Archive)
Reason: T18 renders simple `IdeaRow` placeholders; full `IdeaCard` with overflow menu is T19

#### ❌ FAIL — "Archive idea" in overflow menu archives with undo toast (5s)
Reason: Not implemented (T19)

#### ❌ FAIL — WHAT_IF cards show "Promote to Scene…" in overflow menu
Reason: Not implemented (T19 + T26)

### Projects List (T21 — PENDING)

#### ❌ FAIL — `/projects` lists all projects sorted by `updatedAt` DESC
Reason: `ProjectsListPage.tsx` is a stub (T21)

#### ❌ FAIL — Project rows show title, status badge, logline, counts, date
Reason: Stub (T21)

#### ❌ FAIL — "+ New Project" opens Create Project Modal
Reason: Stub (T21)

#### ❌ FAIL — Empty title shows "Title is required" inline error
Reason: Stub (T21)

#### ❌ FAIL — Creating project navigates to dashboard
Reason: Stub (T21)

#### ❌ FAIL — New project dashboard shows tabs with count 0
Reason: Stub (T21 + T22)

### Project Dashboard (T22 — PENDING)

#### ❌ FAIL — `/projects/:id` loads header with title, status, logline
Reason: `ProjectDashboardPage.tsx` is a stub (T22)

#### ❌ FAIL — Logline editable inline; clicking "No logline yet — add one" activates editing
Reason: Stub (T22)

#### ❌ FAIL — Saving logline PATCHes project, updates header
Reason: Stub (T22)

#### ❌ FAIL — "Edit project" opens Edit Project Modal pre-filled
Reason: Stub (T22)

#### ❌ FAIL — Status change PATCHes; status badge updates
Reason: Stub (T22)

#### ❌ FAIL — Breadcrumb "Projects" navigates back to `/projects`
Reason: Stub (T22)

#### ❌ FAIL — Project not found shows error page
Reason: Stub (T22)

### Ideas Tab (T23 — PENDING) — 7 criteria all FAIL

### Characters Tab (T24 — PENDING) — 9 criteria all FAIL

### Scenes Tab (T25 — PENDING) — 12 criteria all FAIL

### What-If Promotion (T26 — PENDING, COULD) — 6 criteria all FAIL

### Security (Projects API)

#### ✅ PASS — Without JWT → 401 on all project routes
Evidence: Same auth middleware; `app.test.ts` confirms production-mode 401

#### ✅ PASS — `GET /projects/:id` wrong user → 404
Evidence: Per-user DB isolation; `project-repository.ts` `getProject` returns null → 404

#### ✅ PASS — `GET /projects/:id/characters` wrong user → 404
Evidence: Same isolation; `characters.test.ts` confirms

#### ✅ PASS — `userId` never from request body for project/character/scene endpoints
Evidence: All handlers use `c.get('userId')` from auth middleware

### Validation (Projects API)

#### ✅ PASS — `POST /projects` title > 200 chars → 400
Evidence: `CreateProjectSchema` `.max(200)`; `projects.test.ts` confirms

#### ✅ PASS — `POST /projects/:id/characters` obsession > 300 chars → 400
Evidence: `CreateCharacterSchema` `.max(300)`; `characters.test.ts` confirms

#### ✅ PASS — `POST /projects/:id/scenes` description > 1000 chars → 400
Evidence: `CreateSceneSchema` `.max(1000)`; `scenes.test.ts` confirms

#### ✅ PASS — `POST /projects/:id/scenes` position outside [1,2,3] → 400
Evidence: `CreateSceneSchema` `actPosition = z.union([z.literal(1), z.literal(2), z.literal(3)])`; `scenes.test.ts` confirms

---

## Test Suite Summary

| Package | Test Files | Tests | Result |
|---------|-----------|-------|--------|
| backend | 11 | 183 | ✅ All pass |
| frontend | 2 | 33 | ✅ All pass |
| **Total** | **13** | **216** | **✅ All pass** |

---

## Gaps Summary

| # | Gap | Fix | Blocking? |
|---|-----|-----|-----------|
| 1 | "Stale ideas" sidebar filters by sort, not stale status | Add `stale=true` API param or client-side filter | Yes |
| 2 | Type counts in sidebar don't scope to current project/search filters | Backend scoped-counts or accept as v1 simplification | No (cosmetic) |
| 3 | Activity history log not in schema or implementation | Add `activity_log` table or derive from existing timestamps | Yes (T20 dependency) |
| 4 | T19 IdeaCard — no overflow menu, no archive undo | Implement T19 | Yes |
| 5 | T20 IdeaDetailPage — entire page is stub | Implement T20 | Yes |
| 6 | T21–T25 Project pages — all stubs | Implement T21–T25 | Yes |
| 7 | T26 What-If promotion — COULD feature | Implement T26 | No (COULD) |
| 8 | T14 Auth — deferred (no Cognito until T27) | Dev bypass works; deferred to deploy phase | No (deferred by design) |
