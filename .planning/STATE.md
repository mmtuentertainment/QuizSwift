# Project State: QuizSwift

**Last Updated:** 2026-01-23
**Session:** Plan 01-01 execution

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 1 - Foundation & Compliance (Plan 01 complete)

## Current Position

**Phase:** 1 of 8 - Foundation & Compliance
**Plan:** 1 of 5 complete
**Status:** IN_PROGRESS
**Last activity:** 2026-01-23 - Completed 01-01-PLAN.md

**Progress:**
```
[========================================] Roadmap: 100%
[########                                ] Phase 1: 20% (1/5 plans)
[##                                      ] Overall: 2%
```

**Phases Overview:**
| Phase | Name | Status | Requirements |
|-------|------|--------|--------------|
| 1 | Foundation & Compliance | In Progress | 6 |
| 2 | Content & AI Extraction | Pending | 5 |
| 3 | Question Bank & Teacher Workflow | Pending | 10 |
| 4 | Quiz Delivery & Student Experience | Pending | 5 |
| 5 | Anti-Cheating & Randomization | Pending | 2 |
| 6 | Grading & Analytics | Pending | 7 |
| 7 | Google Classroom Integration | Pending | 7 |
| 8 | Dual-Tier AI & Polish | Pending | 5 |

## Performance Metrics

**Session Stats:**
- Plans completed: 1
- Tasks completed: 2
- Blockers resolved: 3 (auto-fixed)

**Cumulative Stats:**
- Total phases: 8
- Total requirements: 47
- Requirements completed: 0 (foundation plan, no requirements closed yet)

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

### Technical Stack (from research + 01-01)

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter
- **Auth:** Auth.js v5 (next-auth@5.0.0-beta.30) + @auth/prisma-adapter
- **AI:** Ollama (free) + OpenAI (paid) via Vercel AI SDK
- **PDF:** unpdf + Tesseract.js
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
- Prisma 7 exports from `client.ts` not index file - adjust imports accordingly
- dotenv must be installed explicitly for prisma.config.ts

## Session Continuity

### What Just Happened

Executed plan 01-01 (Project Foundation):
- Initialized Next.js 16 with TypeScript, Tailwind CSS, ESLint
- Configured Prisma 7 with PostgreSQL adapter
- Created Auth.js v5 schema (User, Account, Session, VerificationToken)
- Added AuditLog model for FERPA compliance
- Established Prisma singleton pattern

Commits:
- `c96ad4f` - feat(01-01): Initialize Next.js 16 project with auth dependencies
- `ce4faa6` - feat(01-01): Configure Prisma 7 with Auth.js schema and AuditLog

### What Happens Next

1. User configures DATABASE_URL in .env.local
2. User runs `npx prisma migrate dev` to create database tables
3. Execute plan 01-02: Auth.js configuration with Google OAuth

### Context for Next Session

If starting fresh:
1. Read this file for current position
2. Read `.planning/phases/01-foundation-compliance/01-01-SUMMARY.md` for plan details
3. Ensure DATABASE_URL is configured
4. Run `npx prisma migrate dev` before plan 01-02
5. Execute plan 01-02 for Auth.js setup

### Files Modified This Session

- `package.json` - Created (Next.js 16, Auth.js, Prisma)
- `prisma/schema.prisma` - Created (Auth.js models + AuditLog)
- `prisma.config.ts` - Created (Prisma 7 config)
- `src/lib/prisma.ts` - Created (Prisma singleton)
- `.env.local.example` - Created (env template)
- `tsconfig.json` - Modified (exclude experiments)
- `.gitignore` - Modified (prisma SQLite)
- `.planning/phases/01-foundation-compliance/01-01-SUMMARY.md` - Created

---

*State captured: 2026-01-23*
*Next command: Configure DATABASE_URL, then execute plan 01-02*
