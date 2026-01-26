# Project State: QuizSwift

**Last Updated:** 2026-01-26
**Session:** Phase 3 Plan 07 Complete - Question Bank Browse Page

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 3 - Question Bank & Teacher Workflow (Plan 07 of 9 complete)

## Current Position

**Phase:** 3 of 8 - Question Bank & Teacher Workflow
**Plan:** 7 of 9 complete
**Status:** In progress
**Last activity:** 2026-01-26 - Completed 03-07-PLAN.md (Question bank browse page)

**Progress:**
Phase 1: 100% (5/5 plans)   [========================================]
Phase 2: 100% (4/4 plans)   [========================================]
Phase 2.1: 100% (6/6 plans) [========================================]
Phase 3: 78% (7/9 plans)    [===============================         ]
Overall: 61%                [======================================= ]

**Phases Overview:**
| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1 | Foundation & Compliance | COMPLETE | 5/5 |
| 2 | Content & AI Extraction | COMPLETE | 4/4 |
| 2.1 | Intelligent Question Curation | COMPLETE | 6/6 |
| 3 | Question Bank & Teacher Workflow | In Progress | 7/9 |
| 4 | Quiz Delivery & Student Experience | Pending | - |
| 5 | Anti-Cheating & Randomization | Pending | - |
| 6 | Grading & Analytics | Pending | - |
| 7 | Google Classroom Integration | Pending | - |
| 8 | Dual-Tier AI & Polish | Pending | - |

## Performance Metrics

**Session Stats:**
- Plans completed: 1 (03-07)
- Tasks completed: 3
- Duration: 6 min

**Cumulative Stats:**
- Total phases: 8 (+ 2.1 sub-phase)
- Plans completed: 22/36+ (approximate)

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Compliance-first architecture | COPPA/FERPA not retrofittable, privacy-by-design required | 1 |
| Extraction-only AI (no generation) | Core differentiator, eliminates hallucination risk | 2 |
| Any type for AI models | Ollama V1 and OpenAI V3 provider versions incompatible | 2-04 |
| Grounding thresholds 0.85/0.75 | Balances accuracy vs recall for verification | 2-04 |
| Flag-not-reject pattern | ALL questions stored, flagged ones have flagReason | 2-04 |
| 5-pass sequential AI pipeline | Each pass builds on previous for holistic understanding | 2.1-03 |
| 2x question generation | Generate double for selection flexibility | 2.1-03 |
| Separate CuratedQuestion model | Parallel systems during transition without data migration | 2.1-04 |
| Event-based routing | pdf/curation.ready vs pdf/processing.complete for clean separation | 2.1-04 |
| Discriminated unions with type field | Runtime type checking for 6 question types | 03-01 |
| Legacy type aliases | Backward compatibility during refactor to new types | 03-01 |
| Component-local option types | Avoid circular dependencies with lib types in question components | 03-02 |
| Position-based matching | left[i] matches right[i] - simple alignment after reorder | 03-03 |
| Shuffle on initial render | Fair quiz-taking by randomizing right column | 03-03 |
| URL-based filter state | Bookmarkable, shareable, browser back button works | 03-07 |
| teacherSelected filter in bank | Question bank shows curated picks, not full 2x pool | 03-07 |

### Technical Stack

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter + pgvector
- **AI:** OpenAI via Vercel AI SDK + ollama-ai-provider@1.2.0
- **Background Jobs:** Inngest 3.49.3
- **Structured Output:** Zod 3.25.76 for AI schema validation
- **Drag-and-Drop:** @dnd-kit/core@6.3.1, @dnd-kit/sortable@10.0.0, @dnd-kit/utilities@3.2.2

### Patterns Established (03-02, 03-03, 03-07)

- QuestionRenderer switch pattern for dispatching to type-specific components
- Consistent props interface: options, answer/value, onChange, readOnly, showCorrect
- LaTeX support via MathText in all question types
- SortableItem pattern with useSortable hook for accessible drag-and-drop
- Server actions pattern for authenticated data fetching (src/actions/)
- URL searchParams for filter state management

### Lessons Learned

- AI provider version incompatibility: ollama uses V1, @ai-sdk/openai uses V3 - use any type
- Ollama provider uses textEmbeddingModel not embeddingModel method
- Prisma Json type requires undefined not null for nullable fields
- Prisma schema validation requires all related models to exist before validation passes
- dnd-kit provides excellent React 19 compatibility and keyboard accessibility out of the box
- useSearchParams + router.push pattern enables URL-based filter state

## Session Continuity

### What Just Happened

Completed Phase 3 Plan 07 (Question Bank Browse Page):
- Created server actions for question queries with filtering/pagination
- Built QuestionFilters component with document, type, bloom level dropdowns
- Built QuestionList with paginated display and metadata badges
- Created QuestionEditor modal for inline editing from bank
- Implemented /question-bank page with URL-based filter state

### What Happens Next

Phase 3 continues with remaining plans:
- 03-08: Quiz builder to add questions from bank to quizzes
- 03-09: Teacher preview flow before publishing

---

*State captured: 2026-01-26*
*Next command: /gsd:execute-phase 03 plan 08*
