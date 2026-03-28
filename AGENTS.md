# Screenplay Idea Vault — Agent Map

A personal idea vault for capturing, organizing, and developing screenplay ideas.
Built with React + Vite, Lambda + DynamoDB, Cognito auth, deployed on AWS.

This file is a map. Detailed content lives in the docs/ directory.

---

## Tech Stack & Standards
→ `constitution.md` — tech stack, architecture layers, coding standards, naming conventions, definition of done. Read before any implementation task.

## Project Brief
→ `docs/briefs/screenplay-idea-vault-brief.md` — original project intent and scope.

## Requirements
→ `docs/requirements/` — prioritized requirements (MoSCoW). Read before writing specs.

## Design & User Flows
→ `docs/design/` — user flow diagrams, navigation structure.
→ `docs/wireframes/` — HTML wireframes for each screen (open in browser to review).

## Feature Specs
→ `docs/specs/README.md` — index of all specs (active and completed).
→ `docs/specs/{feature-name}.md` — machine-readable spec with acceptance criteria.
**Read the relevant spec before starting any implementation task.**

## Task Lists
→ `docs/tasks/{feature-name}-tasks.md` — atomic task list for each feature.
Find the next PENDING task here. Check dependencies before starting.

## Execution Plans
→ `docs/plans/active/` — in-flight plans with progress and decision logs.
→ `docs/plans/completed/` — finished plans and acceptance reports.

## Deployment
→ `infra/` — AWS CDK stack (TypeScript). Lambda + DynamoDB + S3/CloudFront + Cognito.

## Source Code
→ `src/` — application code. Follow architecture layers in constitution.md.

---

## Working Rules

1. Read the relevant spec before implementing anything.
2. Follow the architecture layers: Types → Config → Repository → Service → Handler → API → UI.
3. Validate all inputs at the boundary with Zod.
4. If a requirement is unclear, stop and ask — don't guess.
5. Mark tasks DONE in the task list when complete.
6. Update execution plans with decisions made during implementation.
