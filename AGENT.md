# Screenplay Idea Vault — Agent Context

This project uses **spec-driven development**. Read these files before touching any code:

1. `constitution.md` — stack, architecture layers, SQLite schema, coding standards
2. `docs/tasks/screenplay-idea-vault-tasks.md` — full task list (start here for what to build next)
3. `docs/plans/active/screenplay-idea-vault-plan.md` — progress tracker

## Current status
All design work complete. Implementation not yet started. Begin at **T01**.

## Key design decisions
- **Data layer**: SQLite per user, stored as a single S3 object via the `ulca` package (`~/Code/ulca`)
- **Local dev**: No AWS needed — `LocalFileS3Client` (to be built in T03) stores `.db` files on disk
- **Architecture**: `Types → Config → Repository → Service → Handler → API → UI` (no skipping layers)
- **Auth bypass**: `DEV_USER_ID` env var skips JWT verification in development

## Specs
- `docs/specs/idea-capture-and-management.md` — ideas CRUD (FR-01–FR-13)
- `docs/specs/projects-characters-scenes.md` — projects, characters, scenes (FR-14–FR-22)

## How to implement a task
1. Read the task definition in `docs/tasks/screenplay-idea-vault-tasks.md`
2. Read the relevant spec section(s) listed in the task
3. Implement, write tests, verify all acceptance criteria pass
4. Mark the task complete in `docs/plans/active/screenplay-idea-vault-plan.md`
5. Move to the next PENDING task

## Dependency: ulca package
The `ulca` package lives at `~/Code/ulca`. Read `~/Code/ulca/AGENT.md` before implementing
anything that touches `S3SQLiteDB`. The `MockS3Client` in `~/Code/ulca/tests/MockS3.ts`
is the test harness for all repository-layer unit tests.

## Monorepo structure (to be created in T01)
```
packages/
  backend/    — Hono + Lambda (TypeScript strict)
  frontend/   — React 18 + Vite + Tailwind
  infra/      — AWS CDK (deferred to T27)
  shared/     — Domain types + Zod schemas
```
