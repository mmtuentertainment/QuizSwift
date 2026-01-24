# Project State: QuizSwift

**Last Updated:** 2026-01-24
**Session:** Phase 2.1 - Intelligent Question Curation

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 2.1 - Intelligent Question Curation (IN PROGRESS)

## Current Position

**Phase:** 2.1 of 8 - Intelligent Question Curation
**Plan:** 4 of 5 complete
**Status:** In progress
**Last activity:** 2026-01-24 - Completed 02.1-04-PLAN.md (Inngest curation job)

**Progress:**
Phase 1: 100% (5/5 plans)   [========================================]
Phase 2: 100% (4/4 plans)   [========================================]
Phase 2.1: 80% (4/5 plans)  [================================        ]
Overall: 36%                [======================                  ]

**Phases Overview:**
| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Foundation & Compliance | COMPLETE | 6 |
| 2 | Content & AI Extraction | COMPLETE | 5 |
| 2.1 | Intelligent Question Curation | IN PROGRESS | 5 |
| 3 | Question Bank & Teacher Workflow | Pending | 10 |
| 4 | Quiz Delivery & Student Experience | Pending | 5 |
| 5 | Anti-Cheating & Randomization | Pending | 2 |
| 6 | Grading & Analytics | Pending | 7 |
| 7 | Google Classroom Integration | Pending | 7 |
| 8 | Dual-Tier AI & Polish | Pending | 5 |

## Performance Metrics

**Session Stats:**
- Plans completed: 4 (02.1-01, 02.1-02, 02.1-03, 02.1-04)
- Tasks completed: 12
- Blockers resolved: 0

**Cumulative Stats:**
- Total phases: 8 (+ 2.1 sub-phase)
- Total requirements: 52
- Requirements completed: 6 (AUTH-01, AUTH-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04)

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

### Technical Stack

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter + pgvector
- **AI:** OpenAI via Vercel AI SDK + ollama-ai-provider@1.2.0
- **Background Jobs:** Inngest 3.49.3
- **Structured Output:** Zod 3.25.76 for AI schema validation

### Lessons Learned

- AI provider version incompatibility: ollama uses V1, @ai-sdk/openai uses V3 - use any type
- Ollama provider uses textEmbeddingModel not embeddingModel method
- Prisma Json type requires undefined not null for nullable fields

## Session Continuity

### What Just Happened

Completed Phase 2.1 Plan 4 (02.1-04-PLAN.md):
- Added CuratedQuestion model with evaluation scores and selection status
- Created Inngest curateQuestionsJob for 5-pass pipeline
- Implemented event-based routing for curation vs legacy extraction
- Documents with requestedQuestionCount trigger curation pipeline

### What Happens Next

1. Continue with 02.1-05: Show-your-work canvas integration (if not already done)
2. Complete Phase 2.1 and proceed to Phase 3

---

*State captured: 2026-01-24*
*Next command: Execute 02.1-05-PLAN.md or proceed to Phase 3*
