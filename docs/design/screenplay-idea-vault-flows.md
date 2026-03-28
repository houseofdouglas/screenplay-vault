# User Flows: Screenplay Idea Vault

**Status**: DRAFT — PENDING REVIEW
**Version**: 1.0
**Date**: 2026-03-22
**Requirements source**: `docs/requirements/screenplay-idea-vault-requirements.md`

---

## Flow 1: Authentication / First Login

**Actor**: User
**Goal**: Access the application
**Precondition**: App is deployed; user has a Cognito account (or is registering for the first time)

```mermaid
flowchart TD
    A([Start: Navigate to app URL]) --> B{Session token valid?}
    B -->|Yes| C[Ideas List]
    B -->|No| D[Login Screen]
    D --> E{Has account?}
    E -->|Yes| F[Enter credentials]
    E -->|No| G[Register Screen]
    G --> H[Verify email]
    H --> F
    F --> I{Auth success?}
    I -->|No| J[Show error: invalid credentials]
    J --> F
    I -->|Yes| K{First login?}
    K -->|Yes| L[Ideas List — Empty State]
    K -->|No| C
    L --> M([End: User lands on empty vault])
    C --> N([End: User lands on their idea list])
```

**Key decision points**:
- Valid session → skip login entirely (Amplify session management)
- First login → show empty state with onboarding prompt

**Screens involved**: Login Screen, Register Screen, Ideas List (Empty State), Ideas List

---

## Flow 2: Quick Capture a New Idea

**Actor**: User
**Goal**: Record a fleeting idea before it disappears
**Precondition**: User is authenticated and anywhere in the app

```mermaid
flowchart TD
    A([Start: User has an idea — on any screen]) --> B[Press capture button / keyboard shortcut]
    B --> C[Quick Capture Modal opens]
    C --> D[Select idea type]
    D --> E{Type selected?}
    E -->|No - save as raw| F[Content field active]
    E -->|Yes| F
    F --> G[Enter content text]
    G --> H{Voice-to-text used?}
    H -->|Yes| I[Web Speech API transcribes]
    I --> G
    H -->|No| J{Optional: assign to project?}
    G --> J
    J -->|Yes| K[Select project from dropdown]
    J -->|No| L{Optional: add tags?}
    K --> L
    L -->|Yes| M[Enter tags]
    L -->|No| N[Save]
    M --> N
    N --> O{Save success?}
    O -->|No| P[Show inline error]
    P --> N
    O -->|Yes| Q[Modal closes — toast confirmation]
    Q --> R([End: Idea saved, user returns to prior screen])
```

**Key decision points**:
- Type can be left blank → idea is saved as raw/untyped (FR-11 indicator applies)
- Project assignment is optional at capture time (FR-03)
- Voice-to-text is on-device via Web Speech API (FR-06)

**Screens involved**: Quick Capture Modal (overlay — appears on any screen)

---

## Flow 3: Browse, Search & Review Ideas

**Actor**: User
**Goal**: Find ideas, assess staleness, update excitement ratings
**Precondition**: User is authenticated; at least one idea exists

```mermaid
flowchart TD
    A([Start: Ideas List]) --> B{Apply filters?}
    B -->|Type filter| C[Filter by idea type]
    B -->|Project filter| D[Filter by project]
    B -->|No filter| E[Show all ideas]
    C --> E
    D --> E
    E --> F{Search?}
    F -->|Yes| G[Enter keyword — search content + tags]
    G --> H[Results update live]
    F -->|No| H
    H --> I{Sort?}
    I -->|By type| J[Sorted list]
    I -->|By date created| J
    I -->|By date last reviewed| J
    I -->|Default| J
    J --> K[Scan list — stale indicator visible on ideas >14 days]
    K --> L[Click an idea]
    L --> M[Idea Detail view]
    M --> N{Update excitement?}
    N -->|Yes| O[Set rating 1–3]
    O --> P[Save — lastReviewedAt updated]
    N -->|No| P
    P --> Q{Edit content?}
    Q -->|Yes| R[Edit inline or in modal]
    R --> S[Save]
    Q -->|No| S
    S --> T([End: Idea reviewed and updated])
```

**Key decision points**:
- Stale indicator (FR-10): shown on ideas where `lastReviewedAt` > 14 days ago
- Raw indicator (FR-11): shown on ideas with no type assigned
- Updating excitement rating implicitly sets `lastReviewedAt`
- Search is client-filtered or API-filtered across `content` and `tags[]`

**Screens involved**: Ideas List, Idea Detail

---

## Flow 4: Create a Screenplay Project

**Actor**: User
**Goal**: Start organizing ideas under a named screenplay
**Precondition**: User is authenticated

```mermaid
flowchart TD
    A([Start: Projects List]) --> B[Click New Project]
    B --> C[Create Project Modal]
    C --> D[Enter title - required]
    D --> E{Add logline?}
    E -->|Yes| F[Enter free-form logline text]
    E -->|No| G[Set status]
    F --> G
    G --> H{Status?}
    H -->|DEVELOPING| I[Save]
    H -->|ACTIVE| I
    H -->|SHELVED| I
    I --> J{Save success?}
    J -->|No| K[Show validation error]
    K --> D
    J -->|Yes| L[Project Dashboard - empty]
    L --> M([End: Project created, user on dashboard])
```

**Key decision points**:
- Logline is free-form text, fully optional at creation (FR-14)
- Status defaults to DEVELOPING

**Screens involved**: Projects List, Create Project Modal, Project Dashboard (empty state)

---

## Flow 5: Project Dashboard Navigation

**Actor**: User
**Goal**: Work within a screenplay project — view and navigate ideas, characters, scenes
**Precondition**: Project exists; user navigates to it

```mermaid
flowchart TD
    A([Start: Projects List]) --> B[Click project]
    B --> C[Project Dashboard]
    C --> D{Which section?}
    D -->|Ideas tab| E[Project Ideas — filtered to this project]
    D -->|Characters tab| F[Character Roster]
    D -->|Scenes tab| G[Scene Bank]
    E --> H[Browse/search ideas assigned to project]
    H --> I{Assign more ideas?}
    I -->|Yes| J[Flow 9: Assign Existing Idea]
    I -->|No| K([End: User continues in dashboard])
    F --> L[View character cards]
    L --> M{Add character?}
    M -->|Yes| N[Flow 6: Add Character]
    M -->|No| K
    G --> O[View scene cards by act position]
    O --> P{Add scene?}
    P -->|Yes| Q[Flow 7: Add Scene]
    P -->|No| K
```

**Key decision points**:
- Dashboard is tab-based: Ideas | Characters | Scenes
- Ideas tab shows only ideas assigned to this project
- Each tab has its own Add action

**Screens involved**: Projects List, Project Dashboard, Project Ideas (tab), Character Roster (tab), Scene Bank (tab)

---

## Flow 6: Add a Character to a Project

**Actor**: User
**Goal**: Create a character record anchored to a screenplay
**Precondition**: User is on the Project Dashboard > Characters tab

```mermaid
flowchart TD
    A([Start: Character Roster tab]) --> B[Click Add Character]
    B --> C[Add Character Modal]
    C --> D[Enter name - required]
    D --> E[Enter obsession - what drives them]
    E --> F[Enter occupation]
    F --> G{Add notes?}
    G -->|Yes| H[Enter free-form notes]
    G -->|No| I[Save]
    H --> I
    I --> J{Save success?}
    J -->|No| K[Show error]
    K --> D
    J -->|Yes| L[Character card appears in roster]
    L --> M([End: Character added to project])
```

**Key decision points**:
- Name is required; all other fields optional but encouraged by UI labels
- Obsession field is the craft-core field (what they *want*)

**Screens involved**: Character Roster (tab), Add Character Modal

---

## Flow 7: Add a Scene to a Project

**Actor**: User
**Goal**: Capture a scene idea into the project's scene bank
**Precondition**: User is on the Project Dashboard > Scenes tab

```mermaid
flowchart TD
    A([Start: Scene Bank tab]) --> B[Click Add Scene]
    B --> C[Add Scene Modal]
    C --> D[Enter description - action line]
    D --> E{Add dialogue snippet?}
    E -->|Yes| F[Enter dialogue fragment]
    E -->|No| G{Assign act position?}
    F --> G
    G -->|Act 1| H[Save with position=1]
    G -->|Act 2| H2[Save with position=2]
    G -->|Act 3| H3[Save with position=3]
    G -->|Unassigned| H4[Save with no position]
    H --> I{Save success?}
    H2 --> I
    H3 --> I
    H4 --> I
    I -->|No| J[Show error]
    J --> D
    I -->|Yes| K[Scene card appears in scene bank]
    K --> L([End: Scene added to project])
```

**Key decision points**:
- Description is an action line (FR-20): not prose, not internal thought
- Act position is optional; unpositioned scenes appear in a general pool
- Scene Bank can be filtered by act position (FR-21)

**Screens involved**: Scene Bank (tab), Add Scene Modal

---

## Flow 8: Archive & Recover an Idea

**Actor**: User
**Goal**: Remove a low-interest idea from the active vault without permanently deleting it
**Precondition**: User is on the Ideas List or Idea Detail

```mermaid
flowchart TD
    A([Start: Ideas List or Idea Detail]) --> B[Open idea actions menu]
    B --> C[Select Archive]
    C --> D{Confirm?}
    D -->|No| E[Return to prior view]
    D -->|Yes| F[Idea hidden from default views]
    F --> G[Toast: Idea archived with Undo action]
    G --> H{Undo within toast timeout?}
    H -->|Yes| I[Idea restored immediately]
    I --> J([End: Idea returned to active vault])
    H -->|No| K([End: Idea archived — still recoverable])
    K --> L{User wants to recover later?}
    L -->|Yes| M[Navigate to Archived Ideas view]
    M --> N[Find idea]
    N --> O[Click Restore]
    O --> P([End: Idea restored to active vault])
```

**Key decision points**:
- Archive is soft delete (FR-13): idea remains in DB, hidden from default list
- Undo toast provides immediate recovery within ~5s
- Archived Ideas view is accessible (exact navigation TBD — filter toggle or separate route)

**Screens involved**: Ideas List, Idea Detail, Archived Ideas View

---

## Flow 9: Assign an Existing Idea to a Project

**Actor**: User
**Goal**: Connect a free-floating idea to a screenplay project
**Precondition**: Idea exists in the vault (unassigned or already assigned); project exists

```mermaid
flowchart TD
    A([Start: Idea Detail]) --> B[Click Assign to Project]
    B --> C{Already assigned to a project?}
    C -->|Yes| D[Show current project — option to reassign]
    C -->|No| E[Project picker dropdown]
    D --> E
    E --> F[Select project]
    F --> G[Save]
    G --> H{Success?}
    H -->|No| I[Show error]
    I --> E
    H -->|Yes| J[Idea now appears in project dashboard]
    J --> K([End: Idea linked to project])
```

**Key decision points**:
- An idea can be reassigned from one project to another
- Assignment is stored on the Idea record as `projectId` (see constitution)

**Screens involved**: Idea Detail, Project Picker (dropdown within detail)

---

## Flow 10: Promote a What-If Idea → Scene

**Actor**: User
**Goal**: Elevate a raw premise spark into a structured scene record (FR-22)
**Precondition**: A WHAT_IF idea exists; a project exists

```mermaid
flowchart TD
    A([Start: Idea Detail for a WHAT_IF idea]) --> B{Idea is assigned to a project?}
    B -->|No| C[Prompt: assign to a project first]
    C --> D[Flow 9: Assign to Project]
    D --> E[Return to Idea Detail]
    B -->|Yes| E
    E --> F[Click Promote to Scene]
    F --> G[Add Scene Modal — pre-filled with WHAT_IF content]
    G --> H[User edits description into proper action line]
    H --> I{Add dialogue snippet?}
    I -->|Yes| J[Enter dialogue]
    I -->|No| K{Set act position?}
    J --> K
    K -->|Yes| L[Select act 1/2/3]
    K -->|No| M[Save]
    L --> M
    M --> N{Save success?}
    N -->|No| O[Show error]
    O --> H
    N -->|Yes| P[Scene added to project's scene bank]
    P --> Q{Archive original WHAT_IF?}
    Q -->|Yes| R[Archive idea - Flow 8]
    Q -->|No| S([End: Scene created, original idea retained])
    R --> S
```

**Key decision points**:
- Idea must be assigned to a project before promotion (scene needs a `projectId`)
- WHAT_IF content pre-populates the scene description as a starting point, not as final copy
- Original idea is optionally archived after promotion (user chooses)

**Screens involved**: Idea Detail, Add Scene Modal, Scene Bank

---

## Screen Inventory

| Screen Name | Description | Flows | Notes |
|---|---|---|---|
| Login Screen | Cognito-hosted or custom auth form | 1 | Public route |
| Register Screen | New account creation | 1 | Public route |
| Ideas List | Main vault — all ideas, searchable/filterable | 1, 3, 8 | Default landing after login |
| Ideas List — Empty State | First-login or zero-idea state with prompt | 1 | Onboarding call-to-action |
| Quick Capture Modal | Global overlay for fast idea entry | 2 | Accessible from any screen via FAB/shortcut |
| Idea Detail | View and edit a single idea | 3, 8, 9, 10 | Also shows stale/raw indicators |
| Archived Ideas View | Browse soft-archived ideas | 8 | Filter toggle or `/archived` route |
| Projects List | All screenplay projects | 4, 5 | Secondary top-level nav item |
| Create Project Modal | New project form | 4 | Logline optional |
| Project Dashboard | Hub for a single project — tabbed | 5 | Three tabs: Ideas, Characters, Scenes |
| Project Ideas (tab) | Ideas filtered to this project | 5, 9 | Subset of Ideas List |
| Character Roster (tab) | All characters in the project | 5, 6 | Card-based layout |
| Add Character Modal | New character form | 6 | Name + obsession required in UX |
| Scene Bank (tab) | All scenes — filterable by act | 5, 7, 10 | FR-21: filter by act 1/2/3 |
| Add Scene Modal | New scene form; reused for promotion | 7, 10 | Pre-filled when promoting from WHAT_IF |
| Project Picker (dropdown) | Inline project selector on Idea Detail | 9 | Not a full screen — inline UI element |

---

## Navigation Structure

**Entry points**
- `/login` — unauthenticated landing
- `/` → redirects to `/ideas` after auth

**Primary navigation** (persistent top-nav or sidebar)
- **Ideas** → `/ideas` — the main vault
- **Projects** → `/projects` — screenplay project list

**Sub-navigation (within Project Dashboard)**
- `/projects/:id` → defaults to Ideas tab
- `/projects/:id/characters`
- `/projects/:id/scenes`

**Global persistent element**
- **Quick Capture button** (FAB or keyboard shortcut `N`) — available on all authenticated routes, opens Quick Capture Modal as an overlay

**Back / breadcrumb navigation**
- Project Dashboard → Projects List (breadcrumb)
- Idea Detail → Ideas List or Project Ideas tab (back button, context-aware)

**Exit points**
- Completing a capture → returns to prior screen
- Archiving an idea → returns to Ideas List
- Completing a project create → lands on new Project Dashboard
