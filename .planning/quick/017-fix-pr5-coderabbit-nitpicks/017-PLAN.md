# Quick Task 017: Fix PR #5 CodeRabbit Nitpicks

**Created:** 2026-01-31
**Status:** complete
**Estimated:** 10 minutes

## Context

PR #5 CodeRabbit review had 3 nitpick comments after quick-016 completed:

1. **016-PLAN.md file count mismatch:** Listed 8 files but only 7 were modified (006-PLAN.md doesn't exist)
2. **database-fixes.md double query:** Inefficient code example with two DB queries when one suffices
3. **016-SUMMARY.md table alignment:** MD060 violations in tables documenting markdown fixes (meta-ironic)

## Tasks

### Task 1: Fix file count in 016-PLAN.md

- Remove 006-PLAN.md from file list (doesn't exist)
- Change "8 issues" to "7 issues"
- Add note explaining 006-PLAN.md doesn't exist

### Task 2: Optimize double query in database-fixes.md

- Add `id: true` to select clause
- Remove redundant second query
- Use `latestAttempt.id` directly

### Task 3: Fix table alignment in 016-SUMMARY.md

- Normalize "Files Modified" table
- Normalize "Commits" table

## Verification

```bash
git diff --stat  # Only .planning/ files modified
```

**Done:** All 3 nitpicks addressed
