# Execution Plan: screenplay-idea-vault

**Started**: 2026-03-22
**Status**: IN PROGRESS

## Progress

- [ ] T01 — Monorepo scaffold
- [ ] T02 — ulca local package integration
- [ ] T03 — Local dev environment (LocalFileS3Client + Hono HTTP server + dev auth bypass)
- [ ] T04 — SQLite schema initialization
- [ ] T05 — Domain types + Zod schemas
- [ ] T06 — IdeaRepository
- [ ] T07 — ProjectRepository
- [ ] T08 — CharacterRepository + SceneRepository
- [ ] T09 — Hono app + DB middleware + auth + health
- [ ] T10 — Ideas API handlers
- [ ] T11 — Projects API handlers
- [ ] T12 — Characters + Scenes API handlers
- [ ] T13 — Frontend scaffold
- [ ] T14 — Auth flow (Amplify + Cognito, with local bypass)
- [ ] T15 — App shell (layout, navigation, routing)
- [ ] T16 — API client + React Query hooks
- [ ] T17 — Quick Capture Modal
- [ ] T18 — Ideas List page + filtering
- [ ] T19 — Idea cards
- [ ] T20 — Idea Detail page
- [ ] T21 — Projects List + Create Project Modal
- [ ] T22 — Project Dashboard shell
- [ ] T23 — Ideas Tab + Assign Drawer
- [ ] T24 — Characters Tab
- [ ] T25 — Scenes Tab (Scene Bank)
- [ ] T26 — What-If → Scene promotion *(COULD)*
- [ ] T27 — AWS deployment *(DEFERRED)*

## Decisions & Notes

- Architecture: SQLite per user via ulca (S3SQLiteDB), local-first development
- Local dev: LocalFileS3Client (filesystem-backed S3 mock) + @hono/node-server + DEV_USER_ID bypass
- Schema gap fixed in T04: added updated_at on all entity tables, source_idea_id on scenes
- T27 deferred until app is fully working locally
