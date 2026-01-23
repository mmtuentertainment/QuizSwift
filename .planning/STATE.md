# Project State: QuizSwift

**Last Updated:** 2026-01-23
**Session:** Plan 01-03 execution

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 1 - Foundation & Compliance (Plan 03 complete)

## Current Position

**Phase:** 1 of 8 - Foundation & Compliance
**Plan:** 3 of 5 complete
**Status:** IN_PROGRESS
**Last activity:** 2026-01-23 - Completed 01-03-PLAN.md

**Progress:**
```
[========================================] Roadmap: 100%
[########################                ] Phase 1: 60% (3/5 plans)
[######                                  ] Overall: 6%
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
- Plans completed: 3
- Tasks completed: 6
- Blockers resolved: 3 (auto-fixed in 01-01)

**Cumulative Stats:**
- Total phases: 8
- Total requirements: 47
- Requirements completed: 3 (AUTH-01, AUTH-04, PLAT-02 audit logging)

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
| Database sessions over JWT | Persistence + auditability for FERPA compliance | 1-02 |
| Session includes user.id | Required for audit logging | 1-02 |
| PostgreSQL trigger-based audit | Captures all modifications regardless of application path | 1-03 |
| Session variable actor context | Transaction-local variables ensure thread safety with connection pooling | 1-03 |

### Technical Stack (from research + implementation)

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter
- **Auth:** Auth.js v5 (next-auth@5.0.0-beta.30) + @auth/prisma-adapter + Google OAuth
- **Audit:** PostgreSQL triggers + application context helpers
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
- Auth.js v5 requires split config for edge middleware compatibility
- Next.js 16 shows middleware deprecation warning (still works, may need migration later)
- PostgreSQL table names from Prisma are quoted and case-sensitive ("User" not "users")

## Session Continuity

### What Just Happened

Executed plan 01-03 (Database Audit Trigger):
- Created PostgreSQL audit_trigger_func() that captures all data modifications
- Attached trigger to User table for FERPA compliance
- Created withAuditContext() helper to pass user identity to database
- Created withSystemContext() for automated processes
- Created getRequestContext() to extract IP/user agent from headers

Commits:
- `d0af601` - feat(01-03): Add PostgreSQL audit trigger for User table
- `b57f194` - feat(01-03): Add application context helpers for audit logging

### What Happens Next

1. Execute plan 01-04: Role-based access control
2. Execute plan 01-05: Data privacy compliance (COPPA/FERPA)

### Context for Next Session

If starting fresh:
1. Read this file for current position
2. Read `.planning/phases/01-foundation-compliance/01-03-SUMMARY.md` for plan details
3. Execute plan 01-04 for role-based access control

### Files Created This Session

- `prisma/migrations/20260123180643_init/migration.sql` - Initial schema with all tables
- `prisma/migrations/20260123180709_add_audit_triggers/migration.sql` - Audit trigger
- `src/lib/db-context.ts` - withAuditContext, withSystemContext exports
- `src/lib/request-context.ts` - getRequestContext for IP/user agent extraction
- `.planning/phases/01-foundation-compliance/01-03-SUMMARY.md` - Plan summary

---

*State captured: 2026-01-23*
*Next command: Execute plan 01-04*
