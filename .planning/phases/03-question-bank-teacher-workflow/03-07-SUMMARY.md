---
phase: 03-question-bank-teacher-workflow
plan: 07
subsystem: question-bank
tags: [react, server-actions, filtering, pagination, teacher-workflow]

dependency_graph:
  requires: ["03-01"]
  provides: ["question-bank-browse", "question-filtering", "question-editing"]
  affects: ["03-08", "03-09"]

tech_stack:
  added: []
  patterns:
    - "URL-based filter state for bookmarking"
    - "Server actions for data fetching with auth"
    - "Debounced search input"
    - "Modal editing pattern"

key_files:
  created:
    - src/actions/questions.ts
    - src/app/(dashboard)/question-bank/page.tsx
    - src/components/question-bank/question-filters.tsx
    - src/components/question-bank/question-list.tsx
    - src/components/question-bank/question-editor.tsx
    - src/components/question-bank/index.ts
  modified: []

decisions:
  - key: "QuestionEditor inline"
    choice: "Create modal editor as part of question-bank"
    rationale: "Plan referenced non-existent QuestionEditor; editing is critical functionality"
  - key: "URL-based filters"
    choice: "Use searchParams for all filter state"
    rationale: "Enables bookmarking, sharing, and back button support"
  - key: "Selected questions only"
    choice: "Filter by teacherSelected=true in query"
    rationale: "Question bank shows curated questions, not full 2x pool"

metrics:
  duration: "6 min"
  completed: "2026-01-26"
---

# Phase 3 Plan 07: Question Bank Browse Page Summary

**One-liner:** Question bank with document/type/bloom/search filtering, pagination, and inline editing modal.

## What Was Built

### Server Actions (src/actions/questions.ts)
- `getQuestions()` - Paginated query with filtering by documentId, questionType, bloomLevel, and text search
- `getTeacherDocuments()` - Documents dropdown data with question counts
- `updateQuestion()` - Update question text, answer, explanation with ownership verification

### UI Components (src/components/question-bank/)
- **QuestionFilters** - Filter controls with document dropdown, type/bloom selects, debounced search
- **QuestionList** - Paginated question cards with metadata badges and edit button
- **QuestionEditor** - Modal for editing question text, answer, and explanation

### Question Bank Page (src/app/(dashboard)/question-bank/page.tsx)
- Server component with parallel data loading
- Stats summary cards (total questions, documents, page info, active filters)
- URL-based filter state for bookmarking/sharing
- Suspense boundaries for loading states

## Implementation Details

### Filter Architecture

```text
URL searchParams --> Server Actions --> Database Query
     ^                                        |
     |                                        v
     +---- QuestionFilters component <-- QuestionList
```

Filters maintain state in URL parameters, enabling:
- Browser back/forward navigation
- Shareable filtered views
- Page refresh preserves filters

### Data Flow
1. Page receives searchParams from Next.js
2. Parallel fetch: documents (for dropdown) + questions (filtered)
3. QuestionFilters reads from searchParams, writes via router.push
4. QuestionList displays with pagination links preserving filters

### Edit Flow
1. User clicks Edit on question card
2. QuestionEditor modal opens with current data
3. Form submission calls updateQuestion server action
4. On success: router.refresh() + close modal
5. List re-fetches with updated data

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Filter state | URL searchParams | Bookmarkable, shareable, back button works |
| Search debounce | 300ms setTimeout | Balance responsiveness vs server load |
| Question filtering | teacherSelected=true | Bank shows curated picks, not full pool |
| Edit modal | Inline in list | Quick edits without page navigation |

## Deviations from Plan

### Auto-added Components
**[Rule 2 - Missing Critical] Created QuestionEditor component**
- **Found during:** Task 2
- **Issue:** Plan referenced src/components/questions/question-editor.tsx which didn't exist
- **Fix:** Created QuestionEditor modal in question-bank directory
- **Files created:** src/components/question-bank/question-editor.tsx
- **Commit:** 8d18238

## Verification Results

| Criterion | Status |
|-----------|--------|
| TypeScript compiles | PASS |
| Page loads at /question-bank | READY (routing configured) |
| Filter by document | READY (documentId param) |
| Filter by type | READY (questionType param) |
| Search filters by text | READY (search param with debounce) |
| Pagination with filters | READY (page param preserved) |
| Edit button opens modal | READY (QuestionEditor component) |

## Success Criteria Verification

- [x] Teacher can browse all questions at /question-bank (CONT-08)
- [x] Filters persist in URL for bookmarking/sharing
- [x] Questions show source document link
- [x] Edit functionality available from bank view

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 873149a | feat | Add question bank server actions |
| 8d18238 | feat | Create question bank UI components |
| a3163ff | feat | Create question bank browse page |

## Files Created

```text
src/actions/questions.ts                              # Server actions
src/app/(dashboard)/question-bank/page.tsx           # Browse page
src/components/question-bank/
  index.ts                                            # Barrel export
  question-filters.tsx                                # Filter controls
  question-list.tsx                                   # Question list
  question-editor.tsx                                 # Edit modal
```

## Next Steps

- **03-08:** Quiz builder to add questions from bank to quizzes
- **03-09:** Teacher preview flow before publishing
- Future: Bulk selection, export, duplicate detection
