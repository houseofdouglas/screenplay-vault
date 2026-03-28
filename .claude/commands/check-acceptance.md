---
description: Validate implementation against spec acceptance criteria
allowed-tools: Read, Grep, Glob, Bash
argument-hint: [feature-name]
---

Run a structured acceptance check against the spec. This is the third phase gate — validates the implementation before deployment or stakeholder review.

## Step 1: Load the spec

Read `docs/specs/$ARGUMENTS.md` (or ask which feature).

Extract all acceptance criteria. These are the checklist items, Given/When/Then statements, or numbered requirements in the spec.

## Step 2: For each acceptance criterion, gather evidence

Do not ask the user whether criteria pass. Find evidence yourself:

**For functional criteria** (e.g., "User can log in with email and password"):
- Find the relevant handler/service with Grep
- Read the implementation
- Find the relevant test and check it passes: `npx vitest run --reporter=verbose 2>&1`
- Mark PASS if test exists and passes, FAIL if test is missing or failing, PARTIAL if test exists but doesn't fully cover the criterion

**For non-functional criteria** (e.g., "API response under 200ms", "No secrets in code"):
- Run relevant checks: `grep -r "process.env" src/`, TypeScript check, etc.
- Mark accordingly

**For UI/UX criteria** (e.g., "Error message shown if login fails"):
- Find the relevant component/handler
- Check if the error path is implemented

## Step 3: Generate the acceptance report

Format the report as:

```markdown
# Acceptance Report: {feature-name}
Date: {date}
Result: PASS | PARTIAL | FAIL

## Summary
{N} criteria checked. {X} passing, {Y} partial, {Z} failing.

## Criteria Results

### ✅ PASS — {criterion}
Evidence: {test name or file:line}

### ⚠️ PARTIAL — {criterion}
Gap: {what is missing}
Suggestion: {what to add}

### ❌ FAIL — {criterion}
Reason: {why it fails}
Required: {what needs to be implemented}
```

## Step 4: Present report and ask for next steps

Show the report to the user.

If result is **PASS**: "All acceptance criteria met. Run `/deploy-aws` to deploy, or continue to the next feature with `/write-spec`."

If result is **PARTIAL or FAIL**: "Here are the gaps. Run `/next-task {feature-name}` to address them, or let me know which ones to fix now."

Do not silently pass failing criteria. Be specific about what is and isn't working.

## Step 5: Save the report

Write the acceptance report to `docs/plans/completed/{feature-name}-acceptance-{date}.md` (or `active/` if partially passing).

Update `docs/specs/README.md` — move the feature from Active to Completed if all criteria pass.
