# Spec: Idea Capture and Management

**Status**: DRAFT — PENDING REVIEW
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Related Specs**: `projects-characters-scenes.md`
**Wireframes**: `docs/wireframes/screenplay-idea-vault-quick-capture-modal.html`, `docs/wireframes/screenplay-idea-vault-ideas-list.html`, `docs/wireframes/screenplay-idea-vault-idea-detail.html`
**Requirements**: FR-01–FR-13, BR-01–BR-04, NFR-01–NFR-07, INT-01–INT-02

---

## Overview

**Summary**: The user can capture a fleeting idea in under 5 seconds from any screen, browse and search their full vault, review each idea with excitement rating and stale indicators, and archive ideas they no longer want in active rotation.

**User Role**: Single authenticated user (personal tool — no multi-user).

**Why**: Creative ideas are fleeting. The vault exists to capture them immediately without friction, then surface them again during development sessions via recency indicators and excitement tracking.

---

## User Stories

- As the user, I want to capture an idea from any screen without losing my place, so that I never lose a thought because I had to navigate somewhere first.
- As the user, I want to categorize each idea by type (What If, Character, Setting, etc.), so that I can browse ideas through a screenplay craft lens rather than a generic notes lens.
- As the user, I want to search and filter my vault by type, project, and keyword, so that I can find the idea I half-remember quickly.
- As the user, I want to see which ideas I haven't revisited in 14+ days, so that I can regularly ask myself "does this still excite me?"
- As the user, I want to rate how excited I am about each idea (1–3), so that I can prioritize which ones to develop.
- As the user, I want to archive ideas I've outgrown without permanently losing them, so that my active vault stays clean.

---

## Functional Requirements

### Authentication
1. All routes except `GET /api/v1/health` require a valid Cognito JWT in the `Authorization: Bearer {token}` header.
2. The frontend authenticates via AWS Amplify; on session expiry the user is redirected to the Cognito hosted UI login page.
3. The `userId` used for all data operations is the `sub` claim from the decoded JWT — never a value from the request body.

### Quick Capture Modal (FR-01–FR-05)
4. A floating action button (+) is persistently visible in the top navigation on all authenticated screens. Pressing it opens the Quick Capture Modal as an overlay without navigating away.
5. The keyboard shortcut `N` opens the Quick Capture Modal from any authenticated screen (unless the user's focus is already inside a text input).
6. The Quick Capture Modal contains: idea type selector (optional), content textarea (required), project selector (optional), tags input (optional).
7. The idea type selector presents 8 options as pill buttons: **No type yet** (default, dashed style), **What If**, **Character**, **Setting**, **First Line**, **Scene**, **Theme**, **News Flash**.
8. Selecting "No type yet" saves the idea without a type. This is valid — ideas saved without a type are considered raw/untyped and receive the FR-11 visual indicator.
9. The content textarea autofocuses when the modal opens.
10. The Save button is disabled while the content field is empty; it becomes active as soon as the user types at least one character.
11. On successful save: the modal closes, the user returns to their prior screen, and a toast notification confirms ("Idea saved") with a "View" link to the new idea's detail page.
12. Pressing Escape or clicking the backdrop dismisses the modal without saving.
13. The project selector dropdown is populated from the user's existing projects. If the user has no projects, the selector is hidden.

### Ideas List (FR-07–FR-09)
14. The Ideas List at `/ideas` displays all non-archived ideas for the authenticated user.
15. The list is sortable by: **Most recent** (default, `createdAt` descending), **Type** (alphabetical by type name), **Last reviewed** (`lastReviewedAt` ascending, nulls first — surfaces least-recently-reviewed ideas).
16. The user can filter by idea type using a left-sidebar type list. Selecting a type shows only ideas of that type. Counts per type update when other filters are active.
17. The user can filter by project using a left-sidebar project list. Selecting a project shows only ideas assigned to that project. An "Unassigned" entry shows ideas with no `projectId`.
18. The user can search ideas by keyword. Search matches against `content` (case-insensitive substring) and `tags[]` (exact tag match). Results update as the user types (debounce 300ms).
19. Active filters are shown as removable chips below the search bar. A "Clear all" link removes all active filters.
20. The result count is displayed above the list ("24 ideas", "3 of 8 What If ideas match 'linguist'").
21. When a search term returns no results, the empty state offers a CTA: "+ Capture '[term]' as idea" — which opens the Quick Capture Modal with the search term pre-filled in the content field.

### Idea Cards (FR-10–FR-12)
22. Each idea card in the list shows: type badge, content (truncated to one line with ellipsis), tags, assigned project name (if any), date added, excitement dots, stale indicator (if applicable).
23. A **stale indicator** (age badge, e.g. "21 days ago", plus a solid left border accent) is shown on any idea where `lastReviewedAt` is more than 14 days ago, or where `lastReviewedAt` is null and `createdAt` is more than 14 days ago.
24. A **raw/untyped indicator** (dashed left border, dashed "UNTYPED" badge) is shown on any idea with no `type` value.
25. The excitement rating is displayed as 3 dots on each card: filled dots = rated, dashed-outline dots = not yet rated.
26. Clicking a card navigates to the Idea Detail page for that idea.
27. Each card has a ⋯ overflow menu containing: **View / Edit**, **Assign to project…**, **Archive idea** (red, separated by a divider). The **Promote to Scene…** option appears in the overflow menu only for ideas with `type === 'WHAT_IF'`.

### Idea Detail (FR-01, FR-03, FR-04, FR-10–FR-13)
28. The Idea Detail page at `/ideas/:ideaId` shows the full idea content, type, tags, assigned project, excitement rating, creation date, last-reviewed date, and activity history.
29. Breadcrumb navigation: "Ideas › [truncated content]" with ‹ › arrows to step to the previous/next idea in the current list context (preserving the active filter/sort/search).
30. A stale banner is shown at the top of the page when `lastReviewedAt` > 14 days ago (or never set). The banner includes the exact age and a "Mark as reviewed" link that sets `lastReviewedAt = now` without requiring any other action.
31. A raw banner is shown when the idea has no type, with a "Set type now" link that activates the type dropdown in the sidebar.
32. The idea content is editable inline: clicking the content text activates a textarea. `⌘+Enter` saves; `Esc` cancels. Saving content also sets `lastReviewedAt = now`.
33. Tags are editable inline: each tag has an ✕ to remove it; a "+ add tag" button opens an inline text input. Tags are saved on blur or Enter.
34. The right sidebar contains: excitement rating widget (3 clickable dots), project selector dropdown, type selector dropdown, creation date, last-reviewed date.
35. Clicking an excitement dot sets the rating to that value (1, 2, or 3). Clicking the currently selected dot clears the rating (sets to null). Updating excitement also sets `lastReviewedAt = now`.
36. The project selector allows assigning or reassigning the idea to any of the user's projects, or setting it to unassigned.
37. The type selector allows changing the idea's type at any time.
38. The "Archive idea…" link in the sidebar danger zone soft-archives the idea (sets `archivedAt`), navigates back to the Ideas List, and shows a toast: "Idea archived" with an "Undo" option that restores within 5 seconds.
39. The activity history log shows timestamped events: captured, type set, project assigned, excitement updated, last reviewed.

### Archived Ideas (FR-13)
40. The sidebar "Inbox" section includes an "Archived" shortcut that filters the Ideas List to show only archived ideas.
41. Archived ideas are hidden from the default Ideas List and all project idea views.
42. On an archived idea's detail page, a banner states "This idea is archived." and provides a "Restore" button that clears `archivedAt`.

---

## Error States & Edge Cases

| Scenario | What Happens |
|---|---|
| User submits Quick Capture with empty content | Save button is disabled (blocked before submission). If somehow submitted, API returns 400 with `error.fields.content = "Content is required"`. |
| User submits Quick Capture and API fails (5xx) | Toast: "Failed to save idea — please try again." Modal stays open with content preserved. |
| Search returns no results | Empty state shown with CTA to capture the search term as a new idea. |
| Idea not found (`GET /ideas/:ideaId` returns 404) | Full-page "Idea not found" message with link back to Ideas List. |
| Unauthenticated request to any `/api/v1/*` route | 401 response. Frontend redirects to login. |
| User tries to access another user's idea (wrong `userId`) | 404 response (not 403) — prevents information leakage. |
| Network failure during inline edit save | Inline error: "Changes not saved — check your connection." Content remains editable. |
| Tag contains a comma | The comma is treated as a delimiter — the input splits into multiple tags. |
| Tag exceeds 50 characters | Validation error inline: "Tags must be 50 characters or less." |
| Idea has no `lastReviewedAt` and was created > 14 days ago | Treated as stale (stale indicator shown). |
| User presses `N` while focus is in a text input | Shortcut is ignored — does not open modal. |

---

## Data Model

### Idea

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `id` | `string` | Yes | UUID v4 | Auto-generated on create |
| `userId` | `string` | Yes | Non-empty | From JWT `sub` — never from request body |
| `type` | `IdeaType \| null` | No | One of enum values | Null = raw/untyped |
| `content` | `string` | Yes | 1–2000 chars | Trimmed before save |
| `projectId` | `string \| null` | No | Must be a project owned by this user | Null = unassigned |
| `tags` | `string[]` | Yes | Max 20 items; each 1–50 chars | Default `[]` |
| `excitement` | `1 \| 2 \| 3 \| null` | No | Integer 1–3 or null | Null = not yet rated |
| `createdAt` | `string` | Yes | ISO 8601 | Set on create; immutable |
| `updatedAt` | `string` | Yes | ISO 8601 | Updated on every write |
| `lastReviewedAt` | `string \| null` | No | ISO 8601 | Set on review, edit, or excitement update |
| `archivedAt` | `string \| null` | No | ISO 8601 | Set on archive; null = active |

```typescript
type IdeaType = 'WHAT_IF' | 'CHARACTER' | 'SETTING' | 'FIRST_LINE' | 'SCENE' | 'THEME' | 'NEWS_FLASH';
```

**Storage**: SQLite table `ideas` + `tags` (see constitution SQLite schema).
The user's database is opened via `S3SQLiteDB.open({ id: cognitoSub, namespace: 'v1', ... })`.

**Repository pattern** (`src/repositories/idea-repository.ts`):
- `listIdeas(db, opts)` — builds a parameterized SQL `SELECT` with `WHERE`, `ORDER BY`, and optional `LIKE` for keyword search.
- `createIdea(db, data)` — `INSERT INTO ideas` + `INSERT INTO tags` inside a single `db.transaction()`.
- `getIdea(db, ideaId)` — `SELECT` with `LEFT JOIN tags`; returns null if not found.
- `updateIdea(db, ideaId, patch)` — `UPDATE ideas SET …` only the supplied fields, inside `db.transaction()`.
- `archiveIdea(db, ideaId)` — `UPDATE ideas SET archived_at = ? WHERE id = ?`.
- `restoreIdea(db, ideaId)` — `UPDATE ideas SET archived_at = NULL WHERE id = ?`.
- Keyword search: `WHERE content LIKE '%' || ? || '%'` (case-insensitive via SQLite default collation).
- Tag search: `WHERE id IN (SELECT idea_id FROM tags WHERE tag = ?)`.
- Type/project counts are derived from `SELECT type, COUNT(*) … GROUP BY type` queries, cheap at personal scale.

---

## API Contract

### GET /api/v1/health
**Auth required**: No
**Description**: Liveness check.
**Response — 200 OK**: `{ "status": "ok" }`

---

### GET /api/v1/ideas
**Auth required**: Yes
**Description**: List ideas for the authenticated user. All filters are applied server-side.

**Query params**:
```typescript
{
  type?:      IdeaType;            // filter by type
  projectId?: string;              // filter by project ('unassigned' = null projectId)
  q?:         string;              // keyword search against content + tags
  sort?:      'recent' | 'type' | 'last_reviewed';  // default: 'recent'
  archived?:  'true' | 'false';    // default: 'false'
}
```

**Response — 200 OK**:
```typescript
{
  data: Idea[];
  meta: {
    total: number;
    typeCounts: Record<IdeaType | 'UNTYPED', number>;
    projectCounts: Record<string, number>;  // projectId → count; 'unassigned' key for null
    staleCutoffDays: 14;
  }
}
```

**Response — 400**: `{ error: "VALIDATION_ERROR"; message: string; fields?: Record<string, string> }`
**Response — 401**: `{ error: "UNAUTHORIZED"; message: "Authentication required" }`

---

### POST /api/v1/ideas
**Auth required**: Yes
**Description**: Create a new idea.

**Request body**:
```typescript
{
  type?:      IdeaType;       // omit or null for raw/untyped
  content:    string;         // required, 1–2000 chars
  projectId?: string | null;
  tags?:      string[];       // default []
  excitement?: 1 | 2 | 3;
}
```

**Response — 201 Created**: `{ data: Idea }`
**Response — 400**: `{ error: "VALIDATION_ERROR"; message: string; fields?: Record<string, string> }`
**Response — 401**: `{ error: "UNAUTHORIZED" }`
**Response — 404**: `{ error: "NOT_FOUND"; message: "Project not found" }` (if projectId supplied but not owned by user)

---

### GET /api/v1/ideas/:ideaId
**Auth required**: Yes
**Description**: Fetch a single idea by ID.
**Response — 200 OK**: `{ data: Idea }`
**Response — 401**: `{ error: "UNAUTHORIZED" }`
**Response — 404**: `{ error: "NOT_FOUND"; message: "Idea not found" }` (returned for wrong userId too — no 403)

---

### PATCH /api/v1/ideas/:ideaId
**Auth required**: Yes
**Description**: Partial update of an idea. All fields are optional — send only fields to change. Updating `content` or `excitement` automatically sets `lastReviewedAt` to now if the caller does not supply it.

**Request body** (all optional):
```typescript
{
  type?:            IdeaType | null;
  content?:         string;
  projectId?:       string | null;
  tags?:            string[];
  excitement?:      1 | 2 | 3 | null;
  lastReviewedAt?:  string;   // ISO 8601; set explicitly via "Mark as reviewed"
}
```

**Response — 200 OK**: `{ data: Idea }`
**Response — 400**: `{ error: "VALIDATION_ERROR"; ... }`
**Response — 401**: `{ error: "UNAUTHORIZED" }`
**Response — 404**: `{ error: "NOT_FOUND"; message: "Idea not found" }`

---

### DELETE /api/v1/ideas/:ideaId
**Auth required**: Yes
**Description**: Soft-archive an idea. Sets `archivedAt = now` in the `ideas` table. Row is retained.

**Response — 200 OK**: `{ data: Idea }` (with `archivedAt` set)
**Response — 401**: `{ error: "UNAUTHORIZED" }`
**Response — 404**: `{ error: "NOT_FOUND"; message: "Idea not found" }`

---

### PATCH /api/v1/ideas/:ideaId/restore
**Auth required**: Yes
**Description**: Unarchive a previously archived idea. Clears `archivedAt`.

**Response — 200 OK**: `{ data: Idea }` (with `archivedAt: null`)
**Response — 401**: `{ error: "UNAUTHORIZED" }`
**Response — 404**: `{ error: "NOT_FOUND"; message: "Idea not found" }`

---

## Acceptance Criteria

### Quick Capture — Happy Path

- [ ] Pressing the + FAB from any authenticated screen opens the Quick Capture Modal without navigating away.
- [ ] Pressing `N` from any authenticated screen (focus not in a text input) opens the Quick Capture Modal.
- [ ] The content textarea is focused automatically when the modal opens.
- [ ] The Save button is disabled when content is empty.
- [ ] With only content entered (no type, no project, no tags), clicking Save calls `POST /api/v1/ideas` and succeeds.
- [ ] After a successful save, the modal closes, the user is on the same screen as before, and a toast "Idea saved" is visible with a "View" link.
- [ ] Clicking "View" in the toast navigates to `/ideas/:ideaId` for the newly created idea.
- [ ] Selecting a type pill before saving results in the idea being stored with that type.
- [ ] Leaving "No type yet" selected results in the idea being stored with `type: null`.
- [ ] Assigning the idea to a project at capture time stores the correct `projectId`.
- [ ] Entering comma-separated tags stores them as individual items in `tags[]`.

### Quick Capture — Error Handling

- [ ] API 5xx on save: modal stays open, content is preserved, toast shows "Failed to save idea — please try again."
- [ ] Pressing Escape dismisses the modal; no idea is created.
- [ ] Clicking the backdrop dismisses the modal; no idea is created.

### Ideas List

- [ ] `/ideas` loads in under 2 seconds on standard broadband (NFR-01).
- [ ] Default view shows all non-archived ideas sorted by `createdAt` descending.
- [ ] Selecting a type in the sidebar filters the list to that type only; the type's count in the sidebar updates to show the filtered count.
- [ ] Selecting "Unassigned" in the project filter shows only ideas with `projectId === null`.
- [ ] Typing in the search box filters the list within 300ms (debounce).
- [ ] Search matches against `content` (case-insensitive) and exact `tags` entries.
- [ ] Active filter chips appear for each active filter.
- [ ] Clicking ✕ on a filter chip removes that single filter.
- [ ] "Clear all" removes all active filters and resets to the default view.
- [ ] The result count reads "N ideas" or "N of M [Type] ideas match '[term]'" when filtered.
- [ ] Zero search results shows "No ideas match '[term]'" and a CTA to capture the term as a new idea.
- [ ] Clicking the no-results CTA opens Quick Capture Modal with the search term pre-filled.

### Stale & Raw Indicators

- [ ] An idea with `lastReviewedAt` more than 14 days ago shows the stale indicator (left border accent + age badge).
- [ ] An idea with `lastReviewedAt === null` and `createdAt` more than 14 days ago also shows the stale indicator.
- [ ] An idea with `type === null` shows the dashed UNTYPED badge and dashed left border.
- [ ] Clicking "Stale ideas" in the sidebar Inbox section filters the list to stale ideas only.
- [ ] Clicking "Raw / untyped" in the sidebar Inbox section filters the list to untyped ideas only.

### Idea Detail

- [ ] Navigating to `/ideas/:ideaId` shows the full idea content, type badge, tags, project, excitement dots, dates.
- [ ] Clicking the idea content text activates inline editing (textarea appears).
- [ ] `⌘+Enter` in edit mode saves the change; `Esc` cancels without saving.
- [ ] After inline save, the `updatedAt` and `lastReviewedAt` fields update to now.
- [ ] The stale banner is visible when `lastReviewedAt > 14 days ago` or null.
- [ ] Clicking "Mark as reviewed" on the stale banner sets `lastReviewedAt = now` and dismisses the banner.
- [ ] Clicking an excitement dot sets the rating; clicking the selected dot clears it to null.
- [ ] Updating excitement sets `lastReviewedAt = now`.
- [ ] Changing the project via the sidebar dropdown PATCHes the idea's `projectId`.
- [ ] Changing the type via the sidebar dropdown PATCHes the idea's `type`.
- [ ] The ‹ › nav arrows step to the previous/next idea in the current list context.
- [ ] Clicking "Archive idea…" in the sidebar sets `archivedAt`, navigates to Ideas List, and shows an "Idea archived — Undo" toast.
- [ ] Clicking Undo within 5 seconds calls `PATCH /ideas/:ideaId/restore` and the idea reappears in the list.

### Archive

- [ ] Archived ideas do not appear in the default Ideas List view.
- [ ] Clicking "Archived" in the sidebar Inbox section shows only archived ideas.
- [ ] An archived idea's detail page shows an "This idea is archived" banner with a Restore button.
- [ ] Clicking Restore calls `PATCH /ideas/:ideaId/restore`, clears `archivedAt`, and removes the banner.

### Security

- [ ] `GET /api/v1/ideas` returns only ideas where `userId` matches the JWT `sub` — never another user's ideas.
- [ ] `GET /api/v1/ideas/:ideaId` for an idea owned by a different user returns 404, not 403.
- [ ] Any request without a valid JWT returns 401.
- [ ] `userId` is never accepted from the request body — always derived from the JWT.
- [ ] No user content appears in CloudWatch logs (NFR-07).

### Validation

- [ ] `POST /api/v1/ideas` with empty `content` returns 400 with `fields.content` error.
- [ ] `POST /api/v1/ideas` with `content` over 2000 chars returns 400.
- [ ] `POST /api/v1/ideas` with an invalid `type` value returns 400.
- [ ] `POST /api/v1/ideas` with a `projectId` that does not belong to the user returns 404.
- [ ] Tag over 50 characters returns 400.
- [ ] More than 20 tags returns 400.

---

## Non-Functional Requirements

- **Performance**: Ideas list initial load ≤ 2s on standard broadband (NFR-01). API responses p95 < 500ms under personal usage load.
- **Validation**: All inputs validated with Zod at the handler layer before any DB interaction (NFR-02).
- **Auth**: JWT verified on every API call; no routes except `/health` are publicly accessible (NFR-03).
- **Browser support**: Chrome, Firefox, Safari — latest two major versions (NFR-04).
- **Responsiveness**: Usable at ≥768px viewport width (NFR-05).
- **Cost**: S3 (< 1 MB database object) + Lambda ARM64 (Graviton2); no always-on resources. Target < $3/month at personal usage (NFR-06).
- **Logging**: No idea content or tags written to CloudWatch. Structured log format: `{ level, message, ideaId, userId: "[redacted]" }` (NFR-07).

---

## Out of Scope (this spec)

- Projects, Characters, and Scenes (see `projects-characters-scenes.md`)
- Voice-to-text capture (FR-06 — COULD)
- Weekly email digest (FR-17 — COULD)
- Promote What-If → Scene (FR-22 — COULD, depends on scenes spec)
- Screenplay formatting or export
- Collaboration or sharing

---

## Open Questions

| Question | Owner | Resolution |
|---|---|---|
| Should `N` shortcut be configurable? | Peter | No — hardcoded for v1 |
| Is "type required" strict or soft? | Peter | Soft — UI encourages it; API accepts null. Raw/untyped is valid. |
| Scene deletion: permanent or soft? | Peter | **Permanent** (scenes are project artifacts, not vault ideas). To be confirmed in projects spec. |
