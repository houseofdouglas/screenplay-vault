# Requirements: Screenplay Idea Vault

**Status**: APPROVED
**Version**: 1.0
**Date**: 2026-03-22
**Project**: screenplay-idea-vault

---

## Business Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| BR-01 | The system shall serve a single authenticated user (personal tool — no multi-user support). | MUST |
| BR-02 | The system shall provide a low-friction path from idea to captured record — optimized for speed of entry. | MUST |
| BR-03 | The system shall organize ideas around screenplay craft frameworks, not general note-taking conventions. | MUST |
| BR-04 | The system shall surface ideas that have not been reviewed recently, to support the "does it still excite you?" discipline. | SHOULD |
| BR-05 | The system shall run at minimal AWS cost for personal/solo use. | MUST |

---

## Functional Requirements

### Idea Capture

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | The system shall allow the user to capture a new idea with a minimum of: type (required), content text (required). | MUST |
| FR-02 | The system shall support the following idea types: WHAT_IF, CHARACTER, SETTING, FIRST_LINE, SCENE, THEME, NEWS_FLASH. | MUST |
| FR-03 | The system shall allow the user to optionally assign an idea to a project at capture time. | SHOULD |
| FR-04 | The system shall allow the user to optionally add tags to an idea at capture time. | SHOULD |
| FR-05 | The system shall allow the user to capture ideas quickly from a persistent capture button or keyboard shortcut, without navigating away from their current view. | SHOULD |
| FR-06 | The system shall support voice-to-text input for idea content using on-device transcription (no server-side audio processing). | COULD |

### Idea Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-07 | The system shall display all ideas in a browsable list, sortable by type, date created, and date last reviewed. | MUST |
| FR-08 | The system shall allow the user to search ideas by keyword across content and tags. | MUST |
| FR-09 | The system shall allow the user to filter ideas by type and by project. | MUST |
| FR-10 | The system shall display a visual indicator for ideas that have not been reviewed in more than 14 days. | SHOULD |
| FR-11 | The system shall display a visual indicator for ideas that have not been assigned a type (raw/untyped ideas). | SHOULD |
| FR-12 | The system shall allow the user to record an excitement rating (1–3) on any idea, and update it over time. | SHOULD |
| FR-13 | The system shall allow the user to archive an idea. Archived ideas are soft-deleted: they are hidden from default views but remain recoverable. | COULD |

### Projects (Screenplays)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-14 | The system shall allow the user to create a named screenplay project with: title (required), logline (optional free-form text), status (DEVELOPING / ACTIVE / SHELVED). | MUST |
| FR-15 | The system shall allow the user to assign existing ideas to a project. | MUST |
| FR-16 | The system shall display a project dashboard showing all ideas, characters, and scenes associated with that project. | MUST |
| FR-17 | The system shall send a weekly email digest of ideas not reviewed in the past 14 days. | COULD |

### Characters

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-18 | The system shall allow the user to create a character record within a project, capturing: name, obsession (what drives them), occupation, and free-form notes. | MUST |
| FR-19 | The system shall display all characters for a project in a character roster view. | MUST |

### Scenes

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-20 | The system shall allow the user to capture a scene record within a project, with: description (action line — not prose), optional dialogue snippet, and optional act position (1, 2, or 3). | MUST |
| FR-21 | The system shall display scenes for a project in a scene bank view, filterable by act position. | SHOULD |

### Idea Development

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-22 | The system shall allow the user to promote a WHAT_IF idea into a Scene record (copying content as a starting point). | COULD |

---

## Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-01 | The application shall load the initial idea list in under 2 seconds on a standard broadband connection. | MUST |
| NFR-02 | All API inputs shall be validated server-side using Zod schemas. | MUST |
| NFR-03 | Authentication shall be enforced on all routes except the health check endpoint. | MUST |
| NFR-04 | The application shall function on modern desktop browsers (Chrome, Firefox, Safari — latest two major versions). | MUST |
| NFR-05 | The application shall be responsive and usable on tablet-sized screens (≥768px). | SHOULD |
| NFR-06 | AWS infrastructure costs shall remain below $5/month at personal usage levels. | MUST |
| NFR-07 | No PII shall be written to CloudWatch logs. | MUST |

---

## Integration Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| INT-01 | The frontend shall authenticate via AWS Cognito User Pool using the Amplify SDK. | MUST |
| INT-02 | The frontend shall communicate with the backend via API Gateway v2 (HTTP API) with Cognito JWT authorization. | MUST |
| INT-03 | Voice-to-text input (FR-06) shall use the browser's native Web Speech API — no external transcription service. | COULD |

---

## Out of Scope

- Screenplay formatting or export (Final Draft territory)
- Collaboration or sharing features
- AI-generated story content or suggestions
- Scrivener integration
- Mobile native apps (iOS/Android)
- Server-side audio or speech processing

---

## Open Questions

*All resolved.*

| ID | Question | Resolution |
|----|----------|------------|
| Q-01 | Weekly email reminders — include in v1? | No — deferred to COULD (FR-17). |
| Q-02 | Show visual indicator for raw/untyped ideas? | Yes — added as FR-11 (SHOULD). |
| Q-03 | Archive = permanent delete or recoverable? | Recoverable — soft archive (FR-13). |
