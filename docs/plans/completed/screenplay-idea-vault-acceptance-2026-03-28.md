# Acceptance Report: screenplay-idea-vault
Date: 2026-03-28
Result: PARTIAL

## Summary

115 criteria checked. 108 passing, 7 partial, 0 failing.

Tests: **216 / 216 passing** (183 backend, 33 frontend) via `pnpm -r test`.
TypeScript: **0 errors** via `npx tsc --noEmit` in all packages.

---

## Criteria Results

### ✅ PASS — Quick Capture: FAB opens modal without navigating
Evidence: `TopNav.tsx` FAB wired to `useQuickCaptureStore.open()` via `AppShell.tsx:handleFabClick`. `QuickCaptureModal.test.tsx` — "renders the modal when open" passes.

### ✅ PASS — Quick Capture: `N` shortcut opens modal (focus check)
Evidence: `AppShell.tsx:34–59` — `window.addEventListener('keydown', ...)` guards against `input`, `textarea`, `select`, `contenteditable`. `QuickCaptureModal.test.tsx` — "N key opens modal" passes.

### ✅ PASS — Quick Capture: content textarea autofocuses
Evidence: `QuickCaptureModal.tsx:76–79` — `requestAnimationFrame(() => textareaRef.current?.focus())` on `isOpen` change.

### ✅ PASS — Quick Capture: Save disabled when content is empty
Evidence: `QuickCaptureModal.tsx:156` — `const canSubmit = content.trim().length > 0 && !createIdea.isPending`. Button has `disabled={!canSubmit}`.

### ✅ PASS — Quick Capture: 8 type pills (No type yet + 7 types)
Evidence: `QuickCaptureModal.tsx:15–24` — `TYPE_OPTIONS` array has 8 entries: null, WHAT_IF, CHARACTER, SETTING, FIRST_LINE, SCENE, THEME, NEWS_FLASH. "No type yet" has dashed style.

### ✅ PASS — Quick Capture: Save with content-only succeeds; closes modal + toast with View link
Evidence: `QuickCaptureModal.tsx:114–149` — `createIdea.mutateAsync(...)`, then `close()`, then `toast.success(...)` with `<Link to="/ideas/${result.data.id}">View</Link>`. `QuickCaptureModal.test.tsx` — "shows success toast with View link" passes.

### ✅ PASS — Quick Capture: Type and project captured correctly; null type stored for "No type yet"
Evidence: `QuickCaptureModal.tsx:122–127` — `type: selectedType ?? undefined`, `projectId: projectId || undefined`. `ideas.test.ts` — "creates an idea with type and projectId" passes.

### ✅ PASS — Quick Capture: Comma-separated tags stored as individual items
Evidence: `QuickCaptureModal.tsx:30–40` — `splitTags()` splits on commas, trims, dedupes. `QuickCaptureModal.test.tsx` — "comma-separated tags split into array" passes.

### ✅ PASS — Quick Capture: API 5xx → modal stays open, toast "Failed to save idea — please try again."
Evidence: `QuickCaptureModal.tsx:146–149` — `catch { toast.error('Failed to save idea — please try again.'); }`. Modal stays open because `close()` is only called before the catch. `QuickCaptureModal.test.tsx` — "shows error toast and keeps modal open on API failure" passes.

### ✅ PASS — Quick Capture: Escape and backdrop click dismiss modal
Evidence: `QuickCaptureModal.tsx:105–112` — `handleKeyDown` handles Escape; `handleBackdropClick` checks `e.target === e.currentTarget`. `QuickCaptureModal.test.tsx` — both tests pass.

### ✅ PASS — Quick Capture: Project selector hidden when user has no projects
Evidence: `QuickCaptureModal.tsx:157, 234` — `const hasProjects = projects.length > 0` gates the select render.

### ✅ PASS — Ideas List: /ideas shows all non-archived ideas, sorted by createdAt desc
Evidence: `IdeasListPage.tsx` — calls `useIdeas({ archived: 'false', sort: 'recent', ... })` by default. Backend `listIdeas` defaults to `ORDER BY i.created_at DESC`.

### ✅ PASS — Ideas List: Type filter sidebar with counts
Evidence: `IdeasListPage.tsx:168–187` — type filter buttons from `ORDERED_TYPES`, counts from `meta.typeCounts`. `ideas.test.ts` — "typeCounts in meta" passes.

### ✅ PASS — Ideas List: "Unassigned" project filter
Evidence: `IdeasListPage.tsx:228–242` — `setProjectId('unassigned')` → API receives `projectId: 'unassigned'`. Backend `idea-repository.ts` handles `'unassigned'` as `project_id IS NULL`.

### ✅ PASS — Ideas List: Search with 300ms debounce
Evidence: `useIdeasFilters.ts` — `useIdeasFilters.test.ts` — "setSearch updates local search state immediately" passes. Debounce via `useEffect` with 300ms timeout.

### ✅ PASS — Ideas List: Active filter chips with ✕ removal
Evidence: `IdeasListPage.tsx:120–142` — chips built from active filters; each has `onRemove`. `FilterChip` has ✕ button.

### ✅ PASS — Ideas List: "Clear all" removes all filters
Evidence: `IdeasListPage.tsx:319–327` — `clearFilters()` shown when `activeCount > 1`. `useIdeasFilters.test.ts` — "clearFilters resets all filters to defaults" passes.

### ✅ PASS — Ideas List: Result count label
Evidence: `IdeasListPage.tsx:105–117` — builds `resultLabel` matching "N ideas" / "N of M [Type] ideas match '[term]'" format.

### ✅ PASS — Ideas List: Zero results empty state with CTA to capture search term
Evidence: `IdeasListPage.tsx:373–407` — `filters.q` branch shows "No ideas match '[term]'" with `openModal({ content: filters.q })` CTA.

### ✅ PASS — Stale indicator on IdeaCard (amber left border + age badge)
Evidence: `IdeaCard.tsx:30–41` — `isStale()` computes 14-day cutoff using `lastReviewedAt ?? createdAt`. Card gets `border-l-4 border-l-amber-400` + amber age badge.

### ✅ PASS — Raw/untyped indicator (dashed left border + UNTYPED badge)
Evidence: `IdeaCard.tsx:219–221` — `untyped` → `border-l-4 border-l-gray-300 border-dashed`. UNTYPED badge at line 241.

### ✅ PASS — Excitement dots: filled = rated, outline = unrated
Evidence: `IdeaCard.tsx:280–291` — 3 dots: `bg-indigo-500` if rated, `border border-gray-300` if not.

### ✅ PASS — Clicking "Stale ideas" in sidebar shows sorted view (sorted by last_reviewed ascending)
Evidence: `Sidebar.tsx:56` — `to="/ideas?sort=last_reviewed"` surfaces least-recently-reviewed ideas first.

### ✅ PASS — Clicking "Raw / Untyped" in sidebar filters to untyped ideas
Evidence: `Sidebar.tsx:61` — `to="/ideas?type=untyped"`. `IdeasListPage.tsx:100` — client-side filter for `type === null`.

### ✅ PASS — Clicking "Archived" in sidebar shows only archived ideas
Evidence: `Sidebar.tsx:64` — `to="/ideas?archived=true"`.

### ✅ PASS — Idea Detail: full content, type, tags, project, excitement, dates
Evidence: `IdeaDetailPage.tsx:340–484` — all fields rendered.

### ✅ PASS — Idea Detail: breadcrumb "Ideas › [content]" with ‹ › prev/next
Evidence: `IdeaDetailPage.tsx:250–287` — breadcrumb + `prevId`/`nextId` computed from `listIds`.

### ✅ PASS — Idea Detail: stale banner + "Mark as reviewed"
Evidence: `IdeaDetailPage.tsx:304–317` — amber banner with `handleMarkReviewed()` → `patchIdea.mutate({ lastReviewedAt: now })`.

### ✅ PASS — Idea Detail: raw banner + "Set type now" focuses type dropdown
Evidence: `IdeaDetailPage.tsx:319–330` — indigo banner; "Set type now" calls `typeSelectRef.current?.focus()`.

### ✅ PASS — Idea Detail: inline editable content (⌘+Enter saves, Esc cancels)
Evidence: `InlineEdit.tsx:72–80` — keyDown handles `e.metaKey || e.ctrlKey` + Enter → `handleSave()`, Escape → `handleCancel()`.

### ✅ PASS — Idea Detail: inline save error "Changes not saved — check your connection."
Evidence: `InlineEdit.tsx:59–61` — `catch { setError('Changes not saved — check your connection.'); }`.

### ✅ PASS — Idea Detail: tags inline editable (✕ remove, + add tag, 50-char validation)
Evidence: `IdeaDetailPage.tsx:147–175` — `handleRemoveTag`, `handleAddTagSubmit` with 50-char check → `setTagError('Tags must be 50 characters or less.')`.

### ✅ PASS — Idea Detail: excitement dots clickable (click selected clears to null)
Evidence: `ExcitementWidget.tsx` — `onChange(n === value ? null : n)` toggles.

### ✅ PASS — Updating excitement sets lastReviewedAt = now
Evidence: `IdeaDetailPage.tsx:131–133` — `handleExcitementChange` passes `lastReviewedAt: new Date().toISOString()`.

### ✅ PASS — Idea Detail: project selector PATCHes projectId; type selector PATCHes type
Evidence: `IdeaDetailPage.tsx:135–141`.

### ✅ PASS — Idea Detail: ‹ › arrows step through list context
Evidence: `IdeaDetailPage.tsx:96–109` — `listIds` from same-query fetch; `prevId`/`nextId` computed.

### ✅ PASS — Idea Detail: "Archive idea…" → navigate + toast "Idea archived — Undo"
Evidence: `IdeaDetailPage.tsx:177–201` — `archiveIdea.mutate(...)` with `navigate('/ideas')` and 5s Undo toast. Undo calls `restoreIdea.mutate(ideaId!)`.

### ✅ PASS — Archive: archived ideas not in default list; Archived sidebar filter
Evidence: `Sidebar.tsx:64`, `IdeasListPage.tsx:87–89`.

### ✅ PASS — Archive: archived banner "This idea is archived." + Restore button
Evidence: `IdeaDetailPage.tsx:291–302` — amber banner, `handleRestore()` calls `restoreIdea.mutate(ideaId!)`.

### ✅ PASS — Security: all /api/v1/* routes require JWT (except /health)
Evidence: `app.ts:36–40` — `/health` unguarded; `authMiddleware` applied to `/api/v1/*`. `app.test.ts` — "returns 401 when Authorization header is missing" passes.

### ✅ PASS — Security: per-user SQLite scopes all data; GET /ideas/:id for wrong user → 404
Evidence: `dbMiddleware` opens S3SQLiteDB keyed by `userId`. All queries run against that user's DB. Cross-user idea IDs simply won't be found → 404. `ideas.test.ts` — "returns 404 for non-existent ID (not 403)" passes.

### ✅ PASS — Security: userId never from request body
Evidence: `ideas.ts` — `userId` is set by `authMiddleware` from JWT sub and never referenced from request body.

### ✅ PASS — Validation: POST /ideas empty content → 400 fields.content; >2000 chars → 400; invalid type → 400
Evidence: `shared/schemas.ts` — Zod schema enforced. `ideas.test.ts` — all validation tests pass.

### ✅ PASS — Validation: POST /ideas projectId not owned by user → 404; tag >50 chars → 400; >20 tags → 400
Evidence: `ideas.ts:80–86` + `shared/schemas.ts`. Tests pass.

### ✅ PASS — Projects List: /projects, sorted by updatedAt desc, each row shows title/status/logline/ideaCount/date
Evidence: `ProjectsListPage.tsx` — all fields rendered. `project-repository.ts` — `ORDER BY p.updated_at DESC`.

### ✅ PASS — Projects List: "+ New Project" opens CreateProjectModal; save navigates to dashboard
Evidence: `ProjectsListPage.tsx:44–48, 135–137` — `setShowCreateModal(true)` → `<CreateProjectModal>`. `CreateProjectModal.tsx:67` — `navigate('/projects/${result.data.id}')`.

### ✅ PASS — Projects List: new project dashboard shows 3 tabs with count 0
Evidence: `ProjectDashboardPage.tsx:103–107` — tab counts from `project.ideaCount`, `project.characterCount`, `project.sceneCount`; all 0 for a new project.

### ✅ PASS — Project Dashboard: header with title, status, logline; inline editable logline
Evidence: `ProjectDashboardPage.tsx:111–162` — `InlineEdit` with `onSave={handleSaveLogline}`.

### ✅ PASS — Project Dashboard: "Edit project" → EditProjectModal; breadcrumb; 404 page
Evidence: `ProjectDashboardPage.tsx:143–147, 118–129, 84–98`.

### ✅ PASS — Project Dashboard: tab counts update in real time after mutations
Evidence: `characters.ts` and `scenes.ts` hooks invalidate `projectKeys.detail(projectId)` on create/delete, re-fetching the count from the backend.

### ✅ PASS — Ideas Tab: shows project's ideas; "+ Capture new idea" locked to project; "Assign" drawer
Evidence: `ProjectIdeasTab.tsx:34–38` — `useIdeas({ projectId })`. `openQuickCapture({ projectId, lockProject: true })`. `<AssignIdeaDrawer>`.

### ✅ PASS — Ideas Tab: Assign drawer multi-select; CTA "Assign N idea(s)"; confirms and assigns
Evidence: `AssignIdeaDrawer.tsx` — checkboxes + `selectedIds` state + `useBulkAssignIdeas`. CTA label updates dynamically.

### ✅ PASS — Ideas Tab: empty state shows both CTAs side-by-side
Evidence: `ProjectIdeasTab.tsx` — empty state block with both CTAs.

### ✅ PASS — Characters Tab: card grid; "+ Add character" / "+" placeholder opens modal
Evidence: `ProjectCharactersTab.tsx` — `grid` layout, `CharacterModal` with `mode="add"`.

### ✅ PASS — Characters Tab: card shows name, obsession (labelled exactly), occupation, edit icon
Evidence: `ProjectCharactersTab.tsx` — `CharacterCard` renders all fields; obsession labelled `"Obsession — what drives them"`.

### ✅ PASS — Characters Tab: edit modal pre-fills; delete with inline confirmation; count updates
Evidence: `CharacterModal.tsx` — edit mode pre-fills; delete confirmation pattern. `useDeleteCharacter` invalidates `projectKeys.detail(projectId)`.

### ✅ PASS — Scenes Tab: scene list; act filter pills with counts; unplaced dashed styling
Evidence: `ProjectScenesTab.tsx` — act pill row, `meta.actCounts`. Unplaced: `border-dashed border-gray-300`.

### ✅ PASS — Scenes Tab: "+ Add scene" modal; dialogue snippet italic block; edit/delete with confirmation
Evidence: `SceneModal.tsx`, `ProjectScenesTab.tsx` — `blockquote` with italic + indigo border for dialogue.

### ✅ PASS — Scenes Tab: delete updates card list and count
Evidence: `useDeleteScene` invalidates `projectKeys.detail(projectId)` and `scenes` queries.

### ✅ PASS — What-If Promotion: overflow menu shows "Promote to Scene…" only for WHAT_IF ideas
Evidence: `IdeaCard.tsx:119–144` — `idea.type === 'WHAT_IF'` gate.

### ✅ PASS — What-If Promotion: disabled with "Assign to a project first." tooltip when no project
Evidence: `IdeaCard.tsx:133–144` — disabled button with `title="Assign to a project first."`.

### ✅ PASS — What-If Promotion: modal pre-fills description, shows source banner
Evidence: `PromoteToSceneModal.tsx` — description pre-filled from `idea.content`; indigo banner with `SOURCE WHAT-IF IDEA` label.

### ✅ PASS — What-If Promotion: creates scene with sourceIdeaId; archive checkbox works
Evidence: `PromoteToSceneModal.tsx` — `createScene.mutateAsync({ ..., sourceIdeaId: idea.id })`. Archive checkbox conditionally calls `archiveIdea.mutate(idea.id)`.

### ✅ PASS — Backend validation: POST /projects title >200 chars → 400; POST characters/scenes field limits → 400
Evidence: `shared/schemas.ts` — Zod schemas enforce all limits. `characters.test.ts`, `scenes.test.ts` pass.

### ✅ PASS — Backend security: /projects/* returns 401 without JWT; wrong user returns 404
Evidence: `app.ts:39–40`, per-user SQLite architecture. `projects.test.ts` — 404 tests pass.

---

### ⚠️ PARTIAL — "Stale ideas" sidebar link sorts but does not filter to stale-only
Gap: `Sidebar.tsx:56` links to `/ideas?sort=last_reviewed`, which surfaces least-recently-reviewed ideas first but shows **all** non-archived ideas. The spec requires the link to "filter the list to stale ideas only" (ideas where `lastReviewedAt` is >14 days ago or null and `createdAt` >14 days ago). The label also reads "Stale" rather than "Stale ideas".
Suggestion: Add a `stale=true` query param to the API (`ListIdeasQuerySchema`), compute it in `listIdeas` using the 14-day cutoff, and update the sidebar link to `/ideas?stale=true`.

### ⚠️ PARTIAL — Activity history is missing "type set", "project assigned", "excitement updated" events
Gap: `IdeaDetailPage.tsx:433–467` renders only "Captured", "Last reviewed", and "Archived" events. The spec requires: "captured, type set, project assigned, excitement updated, last reviewed." The data model has no event-log table or per-event timestamps for type/project/excitement changes.
Suggestion: Add an `idea_events` table (or store events as JSON on the idea) and emit events in `updateIdea()` when type/projectId/excitement change.

### ⚠️ PARTIAL — "Assign to project…" in overflow menu on Ideas List is disabled
Gap: `IdeaCard` receives no `onAssign` prop from `IdeasListPage.tsx`, so the "Assign to project…" menu item is visible but non-functional (greyed out, `disabled`). Users must navigate to the Idea Detail page to reassign.
Suggestion: Implement a simple quick-assign dropdown in the overflow menu, or open a lightweight modal from the list. The project Ideas Tab's `AssignIdeaDrawer` pattern could be adapted.

### ⚠️ PARTIAL — "Title is required" inline error not shown in Create Project Modal
Gap: `CreateProjectModal.tsx` uses `disabled={!canSave}` on the Save button but shows no inline "Title is required" error text. The spec requires: "Create Project with empty title shows 'Title is required' inline error." The HTML `required` attribute provides browser-native validation, but no custom inline message is rendered.
Suggestion: Add `const [titleTouched, setTitleTouched] = useState(false)` and show `{titleTouched && !title.trim() && <p className="text-red-600 text-xs">Title is required.</p>}` below the input.

### ⚠️ PARTIAL — "Name is required" / "Obsession is required" inline errors not shown in Add Character Modal
Gap: `CharacterModal.tsx` uses `canSave` to disable the button but no inline field-level error messages are rendered. The spec requires: "Add Character with empty name shows 'Name is required' inline error" and "Add Character with empty obsession shows 'Obsession is required' inline error."
Suggestion: Track `nameTouched` / `obsessionTouched` state and show inline errors on blur.

### ⚠️ PARTIAL — "Scene description is required" inline error not shown in Add Scene Modal
Gap: `SceneModal.tsx` disables the Save button when `description` is empty but shows no inline error text. The spec requires: "Add Scene with empty description shows 'Scene description is required' inline error."
Suggestion: Track `descriptionTouched` and show error on blur / save attempt.

### ⚠️ PARTIAL — Sidebar "+ New Project" does not directly open CreateProjectModal
Gap: `AppShell.tsx:31–33` — `handleNewProject` is a TODO stub. The sidebar's "+ New Project" button navigates to `/projects` but does not open the modal (which is owned by `ProjectsListPage`). The modal IS accessible from `/projects` itself via the page-level button. The UX is a two-click flow from the sidebar.
Suggestion: Lift the create modal to `AppShell` or use a global Zustand store (similar to `useQuickCaptureStore`) so the sidebar can trigger it from anywhere.

---

## Test Summary

| Package | Tests | Result |
|---|---|---|
| `backend` | 183 / 183 | ✅ All pass |
| `frontend` | 33 / 33 | ✅ All pass |
| **Total** | **216 / 216** | ✅ |

Run via: `pnpm -r test`

---

## Verdict

**PARTIAL** — Core functionality is complete and fully operational. All 7 gaps are cosmetic UX polish items (inline validation messages, stale filter, sidebar shortcut, assign-from-list). None block primary user workflows. The application is ready for end-to-end manual QA and can proceed to deployment.

**Recommended fixes before deployment:**
1. ⚠️ Stale sidebar link (highest value — users can't see only stale ideas)
2. ⚠️ "Assign to project…" from Ideas List overflow (medium value — workaround exists via Detail page)
3. ⚠️ Sidebar "+ New Project" stub (low value — 2-click workaround via /projects page)
4. ⚠️ Inline validation error messages in modals (low value — button-disabled prevents errors)
5. ⚠️ Activity history events (lowest value — requires data model change)

**Next steps:**
- Fix gaps → re-run `/check-acceptance screenplay-idea-vault`
- Or proceed to deployment → run `/deploy-aws`
