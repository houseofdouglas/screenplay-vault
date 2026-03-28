---
description: Implement the next pending task from the screenplay-idea-vault task plan
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Implement the next PENDING task for the screenplay-idea-vault project.

## Step 1: Find the next task

Read `docs/tasks/screenplay-idea-vault-tasks.md`.

Find the first task with `**Status**: PENDING` where all dependencies are `DONE`.

Tell the user:
"Next task: **{task-title}** (~{estimate})
Layer: {layer}
{one-line description}

Starting implementation."

## Step 2: Load relevant context only

Always load:
- `constitution.md` — architecture, SQLite schema, coding standards
- `AGENT.md` — project orientation

Load only what this task needs:
- The specific spec section(s) referenced in the task
- Existing files the task modifies (find with Grep/Glob — read only those files)
- For repository tasks: read `~/Code/ulca/AGENT.md` and `~/Code/ulca/src/S3SQLiteDB.ts`
- For repository tests: read `~/Code/ulca/tests/MockS3.ts`

Do NOT read the entire codebase or full task list.

## Step 3: Implement

Architecture layers (constitution): `Types → Config → Repository → Service → Handler → API → UI`
- Dependencies flow forward only — never skip a layer
- TypeScript strict mode — no `any` types, explicit return types on all exports
- Validate all inputs with Zod at the handler layer (never deeper)
- Structured logging: `{ level, message, ...context }` — no bare console.log strings

**Data layer specifics** (this project uses SQLite via ulca — not DynamoDB):
- Open DB with `S3SQLiteDB.open({ id: userId, namespace: 'v1', bucket, hmacSecret, s3, onCreate: initSchema })`
- In `development` mode: use `LocalFileS3Client` (T03) instead of real S3Client
- All writes inside `db.transaction()` — never raw execute outside a transaction for multi-step ops
- `db.flush()` + `db.close()` in a `finally` block — always, even on errors
- Tests use `MockS3Client` from `~/Code/ulca/tests/MockS3.ts`

## Step 4: Write tests

Write tests alongside implementation — not after.
- Test files colocated as `{file}.test.ts` or in `src/__tests__/`
- Use Vitest
- Each acceptance criterion from the task → at least one test case
- Repository tests: use `MockS3Client` (no Docker, no LocalStack needed)

## Step 5: Self-review

```bash
pnpm tsc --noEmit 2>&1 | head -30
pnpm eslint src/ --max-warnings 0 2>&1 | head -20
pnpm vitest run --reporter=verbose 2>&1 | tail -30
```

Fix all TypeScript errors, lint warnings, and test failures before presenting.

## Step 6: Mark task done

In `docs/tasks/screenplay-idea-vault-tasks.md`, update the task:
```
**Status**: DONE
**Completed**: {date}
```

Check off the task in `docs/plans/active/screenplay-idea-vault-plan.md`.

## Step 7: Present to user

- Files created/modified
- Test results summary
- Any architectural decisions or deviations

If you hit a blocker (unclear requirement, missing dependency, conflicting constraints) — stop and ask rather than guessing.
