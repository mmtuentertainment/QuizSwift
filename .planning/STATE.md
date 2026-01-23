# Project State: QuizSwift

**Last Updated:** 2026-01-23
**Session:** Plan 01-02 execution

## Project Reference

**Core Value:** 100% factual accuracy - every question extracted from source material, never generated

**Current Focus:** Phase 1 - Foundation & Compliance (Plan 02 complete)

## Current Position

**Phase:** 1 of 8 - Foundation & Compliance
**Plan:** 2 of 5 complete
**Status:** IN_PROGRESS
**Last activity:** 2026-01-23 - Completed 01-02-PLAN.md

**Progress:**
```
[========================================] Roadmap: 100%
[################                        ] Phase 1: 40% (2/5 plans)
[####                                    ] Overall: 4%
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
- Plans completed: 2
- Tasks completed: 4
- Blockers resolved: 3 (auto-fixed in 01-01)

**Cumulative Stats:**
- Total phases: 8
- Total requirements: 47
- Requirements completed: 2 (AUTH-01, AUTH-04 ready for verification)

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

### Technical Stack (from research + implementation)

- **Framework:** Next.js 16.1.4 + TypeScript 5 + React 19.2.3
- **Database:** PostgreSQL + Prisma 7.3.0 with PrismaPg adapter
- **Auth:** Auth.js v5 (next-auth@5.0.0-beta.30) + @auth/prisma-adapter + Google OAuth
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

## Session Continuity

### What Just Happened

Executed plan 01-02 (Google OAuth Authentication):
- Configured Auth.js v5 with split configuration pattern
- Added Google OAuth provider
- Enabled database sessions for persistence + auditability
- Created login page with Google sign-in button
- Created protected dashboard with user info
- Added middleware for route protection

Commits:
- `274d331` - feat(01-02): Configure Auth.js v5 with split configuration pattern
- `f6b8fa3` - feat(01-02): Create login page and protected dashboard

### What Happens Next

1. User configures Google OAuth credentials (see user_setup in plan)
2. User sets AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_SECRET in .env.local
3. Test authentication flow: login -> OAuth -> dashboard -> logout
4. Execute plan 01-03: Consent flow and DPA compliance

### Context for Next Session

If starting fresh:
1. Read this file for current position
2. Read `.planning/phases/01-foundation-compliance/01-02-SUMMARY.md` for plan details
3. Configure Google OAuth in Google Cloud Console
4. Set environment variables in .env.local
5. Test authentication flow
6. Execute plan 01-03 for consent and DPA

### Files Created This Session

- `src/lib/auth.config.ts` - Edge-compatible auth config
- `src/lib/auth.ts` - Full auth config with PrismaAdapter
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js API handlers
- `src/middleware.ts` - Route protection middleware
- `src/types/next-auth.d.ts` - TypeScript augmentation
- `src/components/auth/sign-in-button.tsx` - Google sign-in button
- `src/components/auth/sign-out-button.tsx` - Sign-out button
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(dashboard)/layout.tsx` - Dashboard layout
- `src/app/(dashboard)/dashboard/page.tsx` - Dashboard page
- `.planning/phases/01-foundation-compliance/01-02-SUMMARY.md` - Plan summary

---

*State captured: 2026-01-23*
*Next command: Configure Google OAuth, then execute plan 01-03*
