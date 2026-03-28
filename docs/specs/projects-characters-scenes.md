# Spec: Projects, Characters, and Scenes

**Status**: DRAFT — PENDING REVIEW
**Created**: 2026-03-22
**Last Updated**: 2026-03-22
**Related Specs**: `idea-capture-and-management.md`
**Wireframes**: `docs/wireframes/screenplay-idea-vault-project-dashboard.html`, `docs/wireframes/screenplay-idea-vault-scene-modal.html`
**Requirements**: FR-14–FR-22, BR-03, NFR-01–NFR-07

---

## Overview

**Summary**: The user can create screenplay projects, organize ideas under them, build out a character roster with craft-focused fields (name, obsession, occupation), and maintain a scene bank of action-line fragments optionally tagged to an act.

**User Role**: Single authenticated user (personal tool).

**Why**: Raw ideas need a home. This feature provides the screenplay-specific scaffolding — logline, character file, scene bank — that bridges loose ideas and a working draft.

---

## User Stories

- As the user, I want to create a named screenplay project with a logline and status, so that I have a north-star to test my ideas against.
- As the user, I want to assign existing vault ideas to a project, so that I can gather the relevant ones without recapturing them.
- As the user, I want a single dashboard for each project showing its ideas, characters, and scenes in tabs, so that I don't have to hunt across screens.
- As the user, I want to capture characters by what they *want* and what they *do* (not how they feel), so that I stay within the craft framework.
- As the user, I want a scene bank where I can drop unordered scene ideas and optionally place them in Act 1/2/3, so that I can blast-capture scenes without worrying about structure first.

---

## Functional Requirements

### Projects List (FR-14)
1. The Projects List at `/projects` displays all projects for the authenticated user, sorted by `updatedAt` descending.
2. Each project row shows: title, status badge (DEVELOPING / ACTIVE / SHELVED), logline (truncated), idea count, last-updated date.
3. A "+ New Project" button opens the Create Project Modal.
4. Clicking a project row navigates to its Project Dashboard at `/projects/:projectId`.

### Create / Edit Project Modal (FR-14)
5. The Create Project Modal contains: title (required, max 200 chars), logline (optional, free-form text, max 500 chars), status selector (required, default DEVELOPING).
6. The Edit Project Modal is identical in layout; it pre-fills the current values and uses `PATCH /api/v1/projects/:projectId`.
7. The status selector presents three options: **DEVELOPING**, **ACTIVE**, **SHELVED**.
8. Saving a new project navigates immediately to the new project's dashboard (empty state).

### Project Dashboard (FR-15, FR-16)
9. The Project Dashboard at `/projects/:projectId` has a persistent header showing: project title, status badge, logline (editable inline — click to edit), and an "Edit project" button.
10. The logline is editable inline (same pattern as Idea Detail content). When not set, it renders as "No logline yet — add one" (a tap target). Saving logline does not require the "Edit project" modal.
11. Below the header, three tabs: **Ideas** (default), **Characters**, **Scenes**, each showing a count.
12. Tab counts update in real time after add/remove operations.
13. The breadcrumb shows: "Projects › [Project Title]".

### Ideas Tab (FR-15, FR-16)
14. The Ideas tab shows a card list of ideas assigned to this project, sorted by `createdAt` descending. The same card format as the main Ideas List is used (type badge, content, tags, stale/raw indicators, excitement).
15. The toolbar contains a search input (filters within this project's ideas), an "Assign existing idea" button, and a "+ Capture new idea" button.
16. "+ Capture new idea" opens the Quick Capture Modal with the current project pre-selected and locked (user cannot change the project assignment in the modal for this entry point).
17. "Assign existing idea" opens a right-side drawer listing all unassigned ideas (plus ideas assigned to other projects, clearly labelled). The drawer supports keyword search and multi-select. The CTA button reads "Assign 1 idea" / "Assign 3 ideas" (count updates dynamically). Confirming PATCHes each selected idea's `projectId`.
18. When the Ideas tab is empty, the empty state shows two side-by-side CTAs: "+ Capture new idea" and "Assign existing idea".

### Characters Tab (FR-18, FR-19)
19. The Characters tab shows character cards in a responsive grid (min card width ~220px).
20. Each character card shows: name (heading), obsession (labelled "Obsession — what drives them"), occupation, and an edit icon.
21. An empty card placeholder with a dashed border and a "+" icon appears at the end of the grid as a persistent add trigger.
22. Clicking the "+" placeholder or the "+ Add character" toolbar button opens the Add Character Modal.
23. The Add Character Modal contains: name (required, max 100 chars), obsession (required, max 300 chars), occupation (required, max 200 chars), notes (optional, max 2000 chars, textarea).
24. The obsession field is labelled "Obsession — what drives them" (the craft principle must be in the label, per BR-03).
25. Clicking the edit icon on a character card opens the Edit Character Modal pre-filled with that character's values.
26. The Edit Character Modal includes a "Delete character…" danger link (red, below a divider). Clicking it shows a confirmation step before permanently deleting the character record.

### Scenes Tab — Scene Bank (FR-20, FR-21)
27. The Scenes tab shows a scene card list, sorted by `createdAt` descending within each act group.
28. An act filter (pill row) above the list: **All** (default), **Act 1**, **Act 2**, **Act 3**, **Unplaced**. Each pill shows a count. Selecting a pill filters the list.
29. "Unplaced" scenes (those with `position === null`) use a dashed left border and a dashed "UNPLACED" act badge.
30. Each scene card shows: scene description (full text, not truncated), dialogue snippet (if present, indented italic below description, with a left border accent), act badge (top-right).
31. A "+ Add scene" toolbar button opens the Add Scene Modal.
32. The Add Scene Modal contains: description (required, action line, max 1000 chars), dialogue snippet (optional, max 500 chars), act position selector (pill: Not placed / Act 1 / Act 2 / Act 3).
33. The description field includes helper text: "Action line only — no internal thought, no prose." and a placeholder: `INT. / EXT. LOCATION — TIME. Action. What happens.` (per BR-03).
34. Clicking the edit icon on a scene card opens the Edit Scene Modal pre-filled with that scene's values.
35. The Edit Scene Modal includes a "Delete this scene…" danger link. Scene deletion is **permanent** (no soft-archive). Clicking it shows a confirmation step.
36. The act position selector in Add/Edit Scene is a 4-way pill: **Not placed yet** (default, dashed), **Act 1**, **Act 2**, **Act 3**. Clicking the selected pill deselects back to "Not placed yet".

### What-If → Scene Promotion (FR-22 — COULD)
37. The ⋯ overflow menu on WHAT_IF idea cards (on both the Ideas List and the Ideas Tab within a project) includes "Promote to Scene…".
38. "Promote to Scene…" is only enabled when the idea is assigned to a project. If the idea has no project, clicking the option shows a prompt: "Assign this idea to a project first."
39. Clicking "Promote to Scene…" opens the Add Scene Modal with the description pre-filled from the idea's content. The modal title changes to "Promote to Scene — from What-If idea" and a banner shows the source idea text.
40. Below the act position selector, a checkbox: "Archive the original What-If idea after saving" (unchecked by default).
41. On save: the scene is created, and if the checkbox was checked, the source idea is archived (same behaviour as `DELETE /api/v1/ideas/:ideaId`).

---

## Error States & Edge Cases

| Scenario | What Happens |
|---|---|
| Create project with empty title | Save button disabled (client); API returns 400 `fields.title` if bypassed. |
| Project not found (`GET /projects/:id` returns 404) | Full-page "Project not found" with link to Projects List. |
| Assign idea — idea already belongs to this project | That idea is not shown in the assign drawer (pre-filtered out). |
| Add character with empty name | Inline validation error: "Name is required." |
| Add character with empty obsession | Inline validation error: "Obsession is required." |
| Add scene with empty description | Save button disabled; API returns 400 if bypassed. |
| Delete character — confirm step | Inline confirmation: "Delete [name]? This cannot be undone." with "Delete" (red) and "Cancel". |
| Delete scene — confirm step | Same pattern as character deletion. |
| Project has no ideas/characters/scenes | Each tab shows a contextual empty state with the appropriate CTA. |
| Promote What-If but idea has no project | Option is shown but disabled with tooltip: "Assign to a project first." |
| Network error on assign ideas | Drawer stays open; toast: "Assignment failed — please try again." |

---

## Data Model

### Project

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `id` | `string` | Yes | UUID v4 | Auto-generated |
| `userId` | `string` | Yes | From JWT `sub` | Never from request body |
| `title` | `string` | Yes | 1–200 chars | Trimmed |
| `logline` | `string \| null` | No | Max 500 chars | Free-form text |
| `status` | `ProjectStatus` | Yes | Enum | Default `DEVELOPING` |
| `createdAt` | `string` | Yes | ISO 8601 | Immutable |
| `updatedAt` | `string` | Yes | ISO 8601 | Updated on every write |

```typescript
type ProjectStatus = 'DEVELOPING' | 'ACTIVE' | 'SHELVED';
```

**Storage**: SQLite `projects` table (see constitution SQLite schema).

**Repository pattern** (`src/repositories/project-repository.ts`):
- `listProjects(db)` — `SELECT p.*, COUNT(i.id), COUNT(c.id), COUNT(s.id) … GROUP BY p.id ORDER BY p.updated_at DESC`
- `createProject(db, data)` — `INSERT INTO projects` inside `db.transaction()`.
- `getProject(db, projectId)` — `SELECT` with aggregate counts.
- `updateProject(db, projectId, patch)` — `UPDATE projects SET … updated_at = ?` inside `db.transaction()`.

---

### Character

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `id` | `string` | Yes | UUID v4 | Auto-generated |
| `projectId` | `string` | Yes | Must exist and be owned by this user | |
| `name` | `string` | Yes | 1–100 chars | Trimmed |
| `obsession` | `string` | Yes | 1–300 chars | What drives them |
| `occupation` | `string` | Yes | 1–200 chars | Trimmed |
| `notes` | `string \| null` | No | Max 2000 chars | Free-form |
| `createdAt` | `string` | Yes | ISO 8601 | Immutable |
| `updatedAt` | `string` | Yes | ISO 8601 | |

**Storage**: SQLite `characters` table (FK → `projects.id ON DELETE CASCADE`).

**Repository pattern** (`src/repositories/character-repository.ts`):
- `listCharacters(db, projectId)` — `SELECT * FROM characters WHERE project_id = ? ORDER BY created_at`.
- `createCharacter(db, data)` — `INSERT INTO characters` inside `db.transaction()`.
- `updateCharacter(db, charId, patch)` — `UPDATE characters SET … WHERE id = ?`.
- `deleteCharacter(db, charId)` — `DELETE FROM characters WHERE id = ?` (permanent).

---

### Scene

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `id` | `string` | Yes | UUID v4 | Auto-generated |
| `projectId` | `string` | Yes | Must exist and be owned by this user | |
| `description` | `string` | Yes | 1–1000 chars | Action line — not prose |
| `dialogueSnippet` | `string \| null` | No | Max 500 chars | |
| `position` | `1 \| 2 \| 3 \| null` | No | Integer 1–3 or null | Act placement; null = unplaced |
| `sourceIdeaId` | `string \| null` | No | Valid ideaId | Set when promoted from a WHAT_IF |
| `createdAt` | `string` | Yes | ISO 8601 | Immutable |
| `updatedAt` | `string` | Yes | ISO 8601 | |

**Storage**: SQLite `scenes` table (FK → `projects.id ON DELETE CASCADE`).

**Repository pattern** (`src/repositories/scene-repository.ts`):
- `listScenes(db, projectId, act?)` — `SELECT * FROM scenes WHERE project_id = ?` + optional `AND position = ?`, plus act count aggregations.
- `createScene(db, data)` — `INSERT INTO scenes` inside `db.transaction()`.
- `updateScene(db, sceneId, patch)` — `UPDATE scenes SET … WHERE id = ?`.
- `deleteScene(db, sceneId)` — `DELETE FROM scenes WHERE id = ?` (permanent).

---

## API Contract

### GET /api/v1/projects
**Auth required**: Yes
**Description**: List all projects for the authenticated user.

**Response — 200 OK**:
```typescript
{
  data: Array<Project & { ideaCount: number; characterCount: number; sceneCount: number }>
}
```

---

### POST /api/v1/projects
**Auth required**: Yes
**Request body**:
```typescript
{ title: string; logline?: string; status?: ProjectStatus }
```
**Response — 201 Created**: `{ data: Project }`
**Response — 400**: `{ error: "VALIDATION_ERROR"; fields?: Record<string, string> }`

---

### GET /api/v1/projects/:projectId
**Auth required**: Yes
**Description**: Fetch a single project with aggregate counts.
**Response — 200 OK**: `{ data: Project & { ideaCount: number; characterCount: number; sceneCount: number } }`
**Response — 404**: `{ error: "NOT_FOUND"; message: "Project not found" }`

---

### PATCH /api/v1/projects/:projectId
**Auth required**: Yes
**Request body** (all optional):
```typescript
{ title?: string; logline?: string | null; status?: ProjectStatus }
```
**Response — 200 OK**: `{ data: Project }`
**Response — 400 / 404**: standard shapes

---

### GET /api/v1/projects/:projectId/characters
**Auth required**: Yes
**Response — 200 OK**: `{ data: Character[] }`
**Response — 404**: project not found

---

### POST /api/v1/projects/:projectId/characters
**Auth required**: Yes
**Request body**:
```typescript
{ name: string; obsession: string; occupation: string; notes?: string }
```
**Response — 201 Created**: `{ data: Character }`
**Response — 400**: validation error
**Response — 404**: project not found

---

### PATCH /api/v1/projects/:projectId/characters/:charId
**Auth required**: Yes
**Request body** (all optional):
```typescript
{ name?: string; obsession?: string; occupation?: string; notes?: string | null }
```
**Response — 200 OK**: `{ data: Character }`
**Response — 404**: project or character not found

---

### DELETE /api/v1/projects/:projectId/characters/:charId
**Auth required**: Yes
**Description**: Permanent deletion — no soft archive.
**Response — 204 No Content**
**Response — 404**: project or character not found

---

### GET /api/v1/projects/:projectId/scenes
**Auth required**: Yes
**Query params**: `{ act?: 1 | 2 | 3 | 'unplaced' }`
**Response — 200 OK**:
```typescript
{
  data: Scene[];
  meta: { actCounts: { 1: number; 2: number; 3: number; unplaced: number; total: number } }
}
```
**Response — 404**: project not found

---

### POST /api/v1/projects/:projectId/scenes
**Auth required**: Yes
**Request body**:
```typescript
{
  description:      string;
  dialogueSnippet?: string;
  position?:        1 | 2 | 3 | null;
  sourceIdeaId?:    string;
}
```
**Response — 201 Created**: `{ data: Scene }`
**Response — 400 / 404**: standard shapes

---

### PATCH /api/v1/projects/:projectId/scenes/:sceneId
**Auth required**: Yes
**Request body** (all optional):
```typescript
{
  description?:      string;
  dialogueSnippet?:  string | null;
  position?:         1 | 2 | 3 | null;
}
```
**Response — 200 OK**: `{ data: Scene }`
**Response — 404**: project or scene not found

---

### DELETE /api/v1/projects/:projectId/scenes/:sceneId
**Auth required**: Yes
**Description**: Permanent deletion.
**Response — 204 No Content**
**Response — 404**: project or scene not found

---

## Acceptance Criteria

### Projects List

- [ ] `/projects` lists all projects, sorted by `updatedAt` descending.
- [ ] Each project row shows title, status badge, truncated logline, idea/character/scene counts, and last-updated date.
- [ ] Clicking "+ New Project" opens the Create Project Modal.
- [ ] Create Project with empty title shows "Title is required" inline error.
- [ ] Successfully creating a project navigates to the new project's dashboard.
- [ ] The new project dashboard shows all three tabs with count 0.

### Project Dashboard

- [ ] Navigating to `/projects/:projectId` loads the dashboard with the project title, status, and logline in the header.
- [ ] The logline is editable inline; clicking "No logline yet — add one" activates editing.
- [ ] Saving the logline inline PATCHes the project and updates the header.
- [ ] "Edit project" opens the Edit Project Modal with current values pre-filled.
- [ ] Changing project status in the modal PATCHes the project; the status badge in the header updates.
- [ ] Breadcrumb "Projects" navigates back to `/projects`.
- [ ] Project not found navigates to a "Project not found" page.

### Ideas Tab

- [ ] The Ideas tab shows only ideas with `projectId` matching this project.
- [ ] "+ Capture new idea" opens Quick Capture Modal with the project pre-selected and locked.
- [ ] "Assign existing idea" opens the assign drawer showing unassigned ideas (and ideas from other projects labelled).
- [ ] Multi-selecting 2 ideas in the drawer and confirming assigns both; the tab count increments by 2.
- [ ] The drawer CTA label reads "Assign 1 idea" / "Assign N ideas" matching the selection count.
- [ ] Removing a project assignment from an idea (via Idea Detail) causes it to disappear from this Ideas tab.
- [ ] Empty Ideas tab shows both CTAs side by side.

### Characters Tab

- [ ] The Characters tab shows all characters for the project in a card grid.
- [ ] "+ Add character" or the "+" placeholder opens the Add Character Modal.
- [ ] Add Character with empty name shows "Name is required" inline error.
- [ ] Add Character with empty obsession shows "Obsession is required" inline error.
- [ ] Successfully adding a character creates the card; the Characters tab count increments.
- [ ] Clicking the edit icon on a character card opens the Edit Character Modal pre-filled.
- [ ] "Delete character…" in Edit Modal shows inline confirmation before deleting.
- [ ] After deletion, the character card is removed and the tab count decrements.
- [ ] The obsession field label reads "Obsession — what drives them" (exact text).

### Scenes Tab

- [ ] The Scenes tab shows all scenes for the project.
- [ ] The act filter shows counts: All, Act 1, Act 2, Act 3, Unplaced.
- [ ] Selecting "Act 2" shows only scenes with `position === 2`.
- [ ] Selecting "Unplaced" shows only scenes with `position === null`.
- [ ] Scenes with `position === null` show a dashed "UNPLACED" badge and dashed left border.
- [ ] "+ Add scene" opens the Add Scene Modal.
- [ ] Add Scene with empty description shows "Scene description is required" inline error.
- [ ] Successfully adding a scene creates the card; the Scenes tab count increments.
- [ ] Scene card shows the dialogue snippet in an indented italic block when present.
- [ ] Edit Scene Modal pre-fills all fields; saving PATCHes the scene.
- [ ] "Delete this scene…" shows inline confirmation before permanently deleting.
- [ ] After deletion, the scene card is removed; tab count and act filter counts update.

### What-If Promotion (FR-22 — COULD)

- [ ] WHAT_IF idea cards show "Promote to Scene…" in the ⋯ overflow menu.
- [ ] Non-WHAT_IF ideas do not show "Promote to Scene…" in the overflow menu.
- [ ] Attempting to promote a WHAT_IF idea with no project shows "Assign to a project first."
- [ ] Promote modal opens with description pre-filled from the idea content and a source banner.
- [ ] Saving the promote modal creates a scene with `sourceIdeaId` set to the idea's `id`.
- [ ] Checking "Archive original idea" and saving also archives the source idea.

### Security

- [ ] Any request to `/api/v1/projects/*` without a valid JWT returns 401.
- [ ] `GET /projects/:projectId` for a project owned by a different user returns 404.
- [ ] `GET /projects/:projectId/characters` for a project owned by a different user returns 404.
- [ ] `userId` is never accepted from the request body for any project/character/scene endpoint.

### Validation

- [ ] `POST /projects` with `title` over 200 chars returns 400.
- [ ] `POST /projects/:id/characters` with `obsession` over 300 chars returns 400.
- [ ] `POST /projects/:id/scenes` with `description` over 1000 chars returns 400.
- [ ] `POST /projects/:id/scenes` with `position` outside `[1, 2, 3]` returns 400.

---

## Non-Functional Requirements

- **Performance**: Project dashboard (including tab counts) loads in ≤ 2s (NFR-01).
- **Validation**: All inputs validated with Zod at the handler layer (NFR-02).
- **Auth**: JWT verified on every request; no project/character/scene data accessible without authentication (NFR-03).
- **Cost**: All entities (projects, characters, scenes, ideas) live in the user's single SQLite `.db` file on S3. No additional tables, GSIs, or provisioned throughput required (NFR-06).
- **Logging**: No project title, character name, scene description, or logline written to CloudWatch logs (NFR-07).

---

## Out of Scope (this spec)

- Weekly email digest of stale ideas (FR-17 — COULD)
- Voice-to-text (FR-06 — COULD)
- Screenplay formatting or export
- Collaboration
- Project deletion (not in requirements — to be addressed post-MVP if needed)

---

## Open Questions

| Question | Owner | Resolution |
|---|---|---|
| Should project deletion be supported? | Peter | Out of scope for v1. Status SHELVED is the equivalent of "hide it." |
| Character deletion: should it warn if notes exist? | Peter | No special warning — standard "Delete [name]? This cannot be undone." is sufficient. |
| Scene deletion: permanent or soft-archive? | Peter | **Permanent** — confirmed in this spec. Scenes are project artifacts, not vault items. |
