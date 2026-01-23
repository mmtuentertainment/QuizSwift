# Project State: QuizSwift

**Last Updated:** 2026-01-23
**Session:** Phase 2 Plan 3 complete - Inngest background processing pipeline

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 2 - Content & AI Extraction (In Progress)

## Current Position

**Phase:** 2 of 8 - Content & AI Extraction (IN PROGRESS)
**Plan:** 3 of 4 complete
**Status:** In progress
**Last activity:** 2026-01-23 - Completed 02-03-PLAN.md (Inngest background processing)

**Progress:**
Phase 1: 100% (5/5 plans) [========================================]
Phase 2: 75% (3/4 plans)  [==============================          ]
Overall: 25%              [================                        ]

**Phases Overview:**
| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Foundation & Compliance | COMPLETE | 6 |
| 2 | Content & AI Extraction | In Progress | 5 |
| 3 | Question Bank & Teacher Workflow | Pending | 10 |
| 4 | Quiz Delivery & Student Experience | Pending | 5 |
| 5 | Anti-Cheating & Randomization | Pending | 2 |
| 6 | Grading & Analytics | Pending | 7 |
| 7 | Google Classroom Integration | Pending | 7 |
| 8 | Dual-Tier AI & Polish | Pending | 5 |

## Performance Metrics

**Session Stats:**
- Plans completed: 3 (02-01, 02-02, 02-03)
- Tasks completed: 7
- Blockers resolved: 2 (DOMMatrix build error, Inngest onFailure event type)

**Cumulative Stats:**
- Total phases: 8
- Total requirements: 47
- Requirements completed: 6 (AUTH-01, AUTH-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04)

## Accumulated Context

### Key Decisions

| Decision | Rationale | Phase |
|----------|-----------|-------|
| Compliance-first architecture | COPPA/FERPA not retrofittable, privacy-by-design required | 1 |
| Extraction-only AI (no generation) | Core differentiator, eliminates hallucination risk for factual content | 2 |
| Teacher-takes-quiz approval | Quality control catches bad extractions before students see them | 3 |
| Server-side randomization | Prevents client inspection, consistent across sessions | 5 |
| Explicit grade state machine | Audit trail, prevents invalid state transitions | 6 |
| Google Classroom before other LMS | 90% US school coverage, validates integration approach | 7 |
| Dual-tier AI (Ollama + OpenAI) | Free tier sustainability with quality upgrade path | 8 |
| Prisma client in src/generated/prisma | Works with @/ import alias, keeps generated code in src | 1-01 |
| Soft delete on User model | COPPA/GDPR compliance - deletedAt instead of hard delete | 1-01 |
| AuditLog with snake_case mapping | FERPA queries on table_name, actor_id, created_at indexes | 1-01 |
| Split auth config pattern | Edge-compatible for middleware, full config for server components | 1-02 |
| JWT sessions over database | Edge middleware compatibility; user data still in DB via adapter | 1-05 |
| Session includes user.id | Required for audit logging | 1-02 |
| PostgreSQL trigger-based audit | Captures all modifications regardless of application path | 1-03 |
| Session variable actor context | Transaction-local variables ensure thread safety with connection pooling | 1-03 |
| Soft delete with anonymization | Preserves referential integrity while removing all PII | 1-04 |
| DPA as Markdown | Easier to maintain/version; schools convert to PDF as needed | 1-04 |
| Paginated audit API (max 1000) | Prevents memory issues with large datasets | 1-04 |
| pgvector with 1536 dimensions | Matches OpenAI text-embedding-3-small output size | 2-01 |
| Public blob access for PDFs | URLs need to be accessible for processing; security via unguessable paths | 2-01 |
| 50MB PDF size limit | Reasonable for educational PDFs; prevents abuse | 2-01 |
| pdfjs-dist v5 canvas property | New API in v5 requires canvas element in render params | 2-02 |
| Worker-per-page for Tesseract | Prevents memory leaks by creating/terminating worker for each page | 2-02 |
| Dynamic imports for PDF modules | pdfjs-dist references DOMMatrix (browser API) causing build errors | 2-03 |
| text-embedding-3-small model | 1536 dimensions; good balance of quality and cost | 2-03 |
| Raw SQL for vector inserts | Prisma doesn't natively support vector type in createMany | 2-03 |

### Technical Stack (from research + implementation)

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter + pgvector
- **Auth:** Auth.js v5 (next-auth@5.0.0-beta.30) + @auth/prisma-adapter + Google OAuth
- **Audit:** PostgreSQL triggers + application context helpers + query API
- **Compliance:** User deletion with anonymization, DPA template, admin dashboard
- **Storage:** Vercel Blob for PDF files
- **AI:** OpenAI via Vercel AI SDK (ai@6.0.49, @ai-sdk/openai@3.0.18)
- **PDF:** unpdf + pdfjs-dist + Tesseract.js + canvas
- **Background Jobs:** Inngest 3.49.3 (full implementation)
- **UI:** shadcn/ui + Tailwind CSS 4
- **Math:** KaTeX

### Open TODOs

- [ ] Legal review of DPA template (Phase 1)
- [ ] Copyright fair use legal consultation (Phase 2)
- [ ] RAG architecture experimentation for grounding thresholds (Phase 2)
- [ ] Teacher UX validation with 5-10 K-12 teachers (Phase 3)
- [ ] Test with real school domain Google accounts (Phase 7)
- [ ] Ollama load testing for 1K+ concurrent users (Phase 8)

### Blockers

None currently.

### Lessons Learned

- npm naming restrictions prevent capital letters - create in temp dir if needed
- Prisma 7 exports from client.ts not index file - adjust imports accordingly
- dotenv must be installed explicitly for prisma.config.ts
- Auth.js v5 requires split config for edge middleware compatibility
- Next.js 16 shows middleware deprecation warning (still works, may need migration later)
- PostgreSQL table names from Prisma are quoted and case-sensitive ("User" not "users")
- pgvector extension requires previewFeatures = ["postgresqlExtensions"] in generator
- pdfjs-dist v5 requires canvas property in RenderParameters (not just canvasContext)
- Tesseract.js recognize() expects Buffer type, not Uint8Array - use Buffer.from()
- pdfjs-dist references DOMMatrix which doesn't exist in Node.js - use dynamic imports
- Inngest onFailure handler receives wrapped event in event.data.event

## Session Continuity

### What Just Happened

Completed Phase 2 Plan 3 (02-03-PLAN.md):
- Replaced Inngest stub client with full implementation
- Created multi-step PDF processing pipeline (9 steps)
- Added embedding utilities using OpenAI text-embedding-3-small
- Document status transitions: pending -> processing -> extracting
- SourceChunks created with embeddings for vector similarity search

### What Happens Next

1. Execute Plan 02-04 (AI question extraction)
2. Complete Phase 2
3. Begin Phase 3 (Question Bank & Teacher Workflow)

### Context for Next Session

If starting fresh:
1. Read this file for current position
2. Phase 2 Plans 1-3 are complete
3. Execute Plan 02-04 with /gsd:execute-phase 02-04-PLAN.md

### Files Created This Session

- src/inngest/client.ts - Full Inngest client with typed events
- src/inngest/functions/process-pdf.ts - Multi-step processing pipeline
- src/inngest/functions/index.ts - Function re-exports
- src/inngest/types.ts - Type re-exports
- src/app/api/inngest/route.ts - Webhook handler
- src/lib/ai/embed.ts - Embedding utilities
- .planning/phases/02-content-ai-extraction/02-03-SUMMARY.md - Plan summary

---

*State captured: 2026-01-23*
*Next command: Execute plan 02-04*
