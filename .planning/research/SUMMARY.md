# Project Research Summary

**Project:** QuizSwift - Quiz generation platform for K-12 teachers
**Domain:** K-12 EdTech / Assessment Platform
**Researched:** 2025-01-23
**Confidence:** HIGH

## Executive Summary

QuizSwift enters a mature, competitive K-12 quiz platform market dominated by Kahoot, Quizlet, and Quizizz. Teachers have baseline expectations for features shaped by these competitors, but there's a clear gap in accuracy and anti-cheating that QuizSwift can exploit. The product's differentiator - 100% factually accurate quizzes extracted from textbook content with teacher approval workflow - addresses real teacher pain points around AI hallucination fears and student cheating (54.7% of online assessments experience cheating).

The recommended technical approach is a Next.js 16 full-stack application with PostgreSQL for FERPA-compliant data storage, a dual-tier AI architecture (Ollama for free tier, OpenAI for premium), and deep Google Classroom integration. The AI pipeline must use extraction-only with RAG grounding and multi-stage verification to prevent hallucinations, not generative AI. The architecture should separate concerns early (content processing, quiz engine, grading workflow, LMS integration) to enable independent scaling and avoid monolithic complexity.

The three critical risks are: (1) COPPA/FERPA compliance violations from day one - this isn't retrofittable and requires privacy-by-design architecture; (2) AI hallucination despite "extraction only" claims - requires multi-stage verification pipeline and mandatory teacher approval workflow; (3) Teacher adoption cliff - 69% of teachers use quizzes "almost daily" with high expectations, so time-to-first-quiz must be under 5 minutes or they abandon. These risks must be addressed in Phase 1 (compliance, architecture) and Phase 2 (AI verification, UX validation) respectively.

## Key Findings

### Recommended Stack

QuizSwift requires a modern TypeScript stack optimized for serverless deployment, COPPA/FERPA compliance, Google Classroom integration, and cost-efficient AI inference through local models. The stack prioritizes type safety (TypeScript + Prisma), developer velocity (Next.js 16 with App Router), and regulatory compliance (PostgreSQL with row-level security).

**Core technologies:**
- **Next.js 16 + TypeScript 5.7**: Full-stack React framework with Server Components for secure API key handling, built-in streaming for AI responses, and optimal Vercel deployment
- **PostgreSQL 16 + Prisma 7**: Relational database for strict data integrity (essential for student grades and FERPA audit trails), with type-safe ORM and row-level security for multi-tenant isolation
- **Ollama + Vercel AI SDK**: Dual-tier AI architecture - local models (Llama 3.1 7B) for free tier to eliminate API costs, cloud APIs (OpenAI) for premium tier, unified through AI SDK abstraction
- **unpdf + Tesseract.js**: PDF text extraction and OCR for processing textbook uploads - unpdf handles text-native PDFs, Tesseract provides fallback for scanned documents
- **Auth.js v5 + googleapis**: Google OAuth for single sign-on and Classroom API integration (roster sync, grade passback) - critical for K-12 adoption
- **shadcn/ui + Tailwind CSS 4**: Component library with full code ownership, built on Radix accessibility primitives, optimized for Next.js
- **KaTeX**: Fast math rendering (3x faster than MathJax) with server-side support for STEM quiz content

**Critical version note:** Auth.js v5 remains in beta but is production-stable in practice. Monitor for breaking changes but don't wait for stable release.

### Expected Features

The K-12 quiz market has clear baseline expectations. Teachers will quickly abandon tools missing core features they've come to expect from Kahoot, Quizlet, and Quizizz. QuizSwift's differentiation strategy (extraction-based accuracy, per-student randomization, teacher approval workflow) only matters if table stakes are met.

**Must have (table stakes):**
- **Multiple question types** (MC, T/F, fill-blank minimum) - all competitors offer 5+ types
- **Google Classroom integration** (SSO, roster sync, grade passback) - used in 90% of US schools, manual roster management is dealbreaker
- **Instant auto-grading** - grading burden is top teacher pain point
- **Real-time results/analytics** - per-question breakdown, class-wide view, formative assessment requires immediate insight
- **Self-paced mode** - homework assignment use case is primary
- **Mobile-friendly student experience** - students use phones/tablets, desktop-only is unusable
- **Free tier with meaningful functionality** - schools have limited budgets, aggressive paywalls prevent adoption
- **Question bank/library** - teachers need to reuse and organize extracted content
- **Image support in questions** - essential for younger students, science, math diagrams

**Should have (competitive advantage):**
- **Content extraction from textbooks** - QuizSwift's core differentiator, saves hours of manual quiz creation
- **Per-student question randomization** - not just order shuffle but different questions entirely from pools, addresses 54.7% cheating rate
- **Teacher-takes-quiz approval workflow** - unique to QuizSwift, builds trust in extraction quality, addresses AI hallucination fears
- **Question pool management** - create pools, draw random subsets per student for anti-cheating
- **Standards alignment tagging** - Common Core/state standards enable district-wide adoption
- **Detailed analytics with gap analysis** - beyond basic scores, identify misconceptions for intervention

**Defer (v2+):**
- **AI-powered difficulty adjustment** - adaptive questioning based on performance (complex)
- **Video-embedded questions** - Edpuzzle-style integration (growing demand but complex)
- **Collaborative/team modes** - Kahoot Team Mode style (shifts from individual assessment)
- **Short answer with AI grading** - valuable but hallucination risk on open-ended responses
- **Multi-language support** - global expansion feature

**Anti-features to avoid:**
- **Public leaderboards** - research shows they increase anxiety in low-performers and demotivate struggling students; make optional/anonymous
- **AI question generation** (not extraction) - violates QuizSwift's accuracy promise, hallucination risk
- **Heavy gamification** (power-ups, memes) - distracts from learning, "diminished motivation" per research
- **Timed questions with pressure** - creates anxiety, disadvantages students with processing differences
- **Native mobile apps** - maintenance burden of 3 platforms, PWA sufficient

### Architecture Approach

The architecture follows a service-oriented pattern within a monolithic Next.js application (appropriate for <10K users), with clear separation of concerns to enable future microservices extraction if needed. Core pattern is event-driven processing for long-running operations (content extraction, AI inference, grade sync) with explicit state machines for grade lifecycle management.

**Major components:**

1. **Content Service** - Handles textbook upload to S3, orchestrates OCR pipeline (unpdf -> Tesseract fallback), stores extracted text in PostgreSQL with source references. Async processing via BullMQ job queue to avoid request timeouts (extraction takes 10-60 seconds).

2. **AI Pipeline** - Extraction-only question generation using RAG architecture. Multi-stage verification: (1) chunk source content into FAISS vector store, (2) extract candidate questions with LLM, (3) verify each Q&A is grounded in source chunks with BM25 + semantic search, (4) reject questions below grounding threshold. Dual-model router: free tier uses local Ollama (Llama 3.1 7B), paid tier uses OpenAI API via Vercel AI SDK.

3. **Quiz Service** - Quiz CRUD, server-side question randomization with deterministic seeds (Fisher-Yates shuffle), question pool management for per-student variant selection, quiz delivery with attempt tracking. Critical: randomization is server-side and deterministic so same student always sees same questions for review consistency.

4. **Grading Service** - Explicit state machine: `ungraded` -> `auto_scored` -> `pending_review` -> `approved` -> `synced`. Auto-scoring for objective questions (MC, T/F), teacher review queue for manual adjustment, confidence indicators flag uncertain grades for review. State transitions logged for audit trail.

5. **Integration Service** - Google Classroom OAuth 2.0 flow with refresh handling, roster sync via `courses.students.list`, grade passback via `courses.courseWork.studentSubmissions.patch`. Async queue for grade sync with retry logic (Google API has rate limits). Critical: must test with real school domains, not @gmail.com accounts.

6. **Analytics Service** - Real-time results dashboard, per-question performance breakdown, class-wide gap analysis, historical trends. Separate read model optimized for analytics queries.

**Key patterns:**
- **RAG with verification** for hallucination prevention - don't trust extraction, verify against source
- **Event-driven processing** for long-running operations - upload triggers OCR job, OCR completion triggers extraction job
- **State machine for grades** - explicit transitions with guards, prevents invalid state changes
- **Dual-tier model routing** - free/paid routing at inference gateway layer for cost management

**Anti-patterns to avoid:**
- Synchronous AI processing in HTTP handlers (causes timeouts)
- Client-side question randomization (students can inspect, inconsistent on refresh)
- Direct Google API calls without queue (no retry on rate limits)
- Single `graded: boolean` field (no workflow tracking)

### Critical Pitfalls

Research identified 12 pitfalls across critical, moderate, and minor severity. Top 5 that must be addressed early:

1. **COPPA/FERPA Compliance Theater** - Teams claim "FERPA compliant" without understanding FERPA governs schools, not vendors. FTC's 2025 COPPA amendments (effective April 2026) add new requirements most startups don't know. **Avoid:** Build COPPA-first (verifiable parental consent, data minimization, retention policies), create Data Processing Agreements for districts, document privacy practices - districts can't proceed without this. Architecture must be privacy-by-design from Phase 1. Never claim "FERPA compliant," say "FERPA-ready" or "supports schools' FERPA compliance."

2. **AI Hallucination Despite "Extraction Only" Claims** - RAG reduces but doesn't eliminate hallucinations (40% reduction, not elimination). Research proves hallucinations are mathematically inevitable in current LLM architectures. Teachers lose trust from a single wrong answer in K-12 context. **Avoid:** Multi-stage verification pipeline (extract -> generate -> verify grounding -> teacher approval), confidence scoring with rejection threshold, source attribution always visible, teacher-takes-quiz-first mandatory workflow, easy "flag this question" mechanism. Address in Phase 2 as foundational AI architecture.

3. **Teacher Adoption Cliff** - Only 29% of teachers believe they get adequate EdTech training. Districts access 2,700+ tools annually but only half used monthly. Teachers "go rogue" to simpler alternatives. **Avoid:** Time-to-first-quiz under 5 minutes, teacher-first design (pilots before district purchase), onboard to outcomes not features ("Create your first quiz from Chapter 5"), integration with existing workflow (Google Classroom), champion teachers as internal advocates. Validate UX with real teachers in Phase 3 before scaling.

4. **Copyright Infringement Through Content Extraction** - Teams assume "educational use" = fair use automatically (it doesn't). Extracting entire chapters fails "amount" factor. Generated quizzes may be derivative works. Publishers have sent cease-and-desist to similar products. **Avoid:** Understand four-factor test (purpose, nature, amount, market impact), design for transformative use (quizzes testing comprehension, not restating facts), user-uploaded content model shifts some liability, work with publishers for licensing at scale, legal review before launch mandatory. Address in Phase 1 legal/compliance architecture.

5. **School Procurement Calendar Mismatch** - B2B EdTech sales cycles are 9-18 months, not SaaS 30-90 days. School budgets allocated April-May, not September. Miss the window, wait 12-18 months. ESSER funding ended, budgets tighter. **Avoid:** Map sales to school calendar (Jan-Mar relationships, Apr-May budget allocation, Jun-Aug procurement), pilot program model (reduces risk, 30-40% conversion vs 2-5% cold), bottom-up PLG (free tier for teachers who become champions), prepare compliance docs upfront. GTM strategy in Phase 4+ must align with K-12 realities.

**Additional moderate pitfalls:**
- **Google Classroom API Permission Labyrinth** - Must test with real school domains, handle token refresh, domain admin must enable API
- **Cheating Prevention Arms Race** - Per-student question selection from pools, not just order shuffle, defeats screenshot sharing
- **Auto-Grading Trust Gap** - Show the "why" with source references, easy teacher override, confidence indicators
- **Freemium Death Spiral** - EdTech conversion 1-5% vs 8-12% other SaaS, convert on accountability (analytics, LMS sync) not content

## Implications for Roadmap

Based on combined research findings, suggested phase structure optimizes for: (1) compliance/legal foundation before any student data, (2) AI verification architecture before scaling content extraction, (3) teacher UX validation before feature expansion, (4) integration complexity deferred until core value proven.

### Phase 1: Foundation & Compliance (Legal + Auth + Database)
**Rationale:** COPPA/FERPA compliance and copyright considerations are not retrofittable. Architecture must be privacy-by-design from day one. Google Classroom SSO is non-negotiable for K-12 adoption (90% of US schools). Database schema must support audit trails, row-level security, and explicit state machines.

**Delivers:**
- Data Processing Agreement template ready for districts
- Privacy policy and consent flows for under-13 users
- PostgreSQL with row-level security and audit logging
- Google OAuth integration for teacher accounts
- Basic user profiles and role-based access control

**Addresses pitfalls:**
- Pitfall 1: COPPA/FERPA compliance architecture
- Pitfall 4: Copyright compliance (legal review, ToS)
- Pitfall 12: Accessibility as architectural concern (WCAG 2.1 AA)

**Stack elements:** PostgreSQL 16, Prisma 7, Auth.js v5, googleapis, Next.js 16 App Router

**Research flag:** MEDIUM - Compliance documentation needs legal review, but technical patterns are well-established.

---

### Phase 2: Core AI Extraction Pipeline (Content + Verification)
**Rationale:** QuizSwift's core differentiator is accurate extraction from textbooks. AI verification pipeline must be foundational architecture, not afterthought. Multi-stage verification prevents hallucinations. Teacher approval workflow builds trust. This phase validates technical feasibility before UX investment.

**Delivers:**
- PDF/image upload to S3 object storage
- OCR pipeline (unpdf for text-native, Tesseract for scanned)
- AI extraction pipeline with RAG grounding (FAISS vector store)
- Multi-stage verification: extract -> generate -> verify grounding -> confidence scoring
- Question bank with source attribution and confidence scores
- Teacher preview/approval workflow (teacher-takes-quiz-first)

**Addresses pitfalls:**
- Pitfall 2: AI hallucination prevention with verification pipeline
- Technical debt: No confidence scores is unacceptable (needed for filtering)
- Anti-pattern: Synchronous AI processing (use job queue)

**Stack elements:** Ollama (local inference), Vercel AI SDK, unpdf, Tesseract.js, BullMQ (job queue), FAISS (vector store)

**Research flag:** HIGH - RAG architecture and hallucination prevention patterns are well-documented, but implementation requires careful testing. Teacher approval UX needs validation.

---

### Phase 3: Quiz Engine & Student Experience (Core MVP)
**Rationale:** Can't validate teacher adoption without functional quiz flow. Student experience must be mobile-responsive (students use phones). Time-to-first-quiz under 5 minutes is critical adoption metric. Focus on objective question types (MC, T/F, fill-blank) where auto-grading is reliable.

**Delivers:**
- Quiz builder (select questions from bank, configure settings)
- Question types: multiple choice, true/false, fill-in-blank
- Server-side question randomization (Fisher-Yates with deterministic seed)
- Self-paced quiz delivery with mobile-responsive UI
- Auto-grading for objective questions with source attribution
- Basic results dashboard (per-student, per-question breakdown)
- Image support in questions and answers

**Addresses pitfalls:**
- Pitfall 3: Teacher adoption cliff (time-to-first-quiz validation)
- Pitfall 8: Auto-grading trust (source attribution, easy override)
- Anti-pattern: Client-side randomization (use server-side with seed)

**Stack elements:** React 19 Server Components, shadcn/ui, Tailwind CSS 4, KaTeX (math rendering)

**Features delivered:** Table stakes - question types, auto-grading, mobile-friendly, question bank

**Research flag:** LOW - Quiz engine and grading patterns are standard, well-documented in EdTech space.

---

### Phase 4: Anti-Cheating & Randomization (Differentiation)
**Rationale:** Per-student question randomization is core differentiation vs competitors (Kahoot/Quizizz only shuffle order). 54.7% cheating rate in online assessments demands robust anti-cheating. Question pools enable drawing different subsets per student.

**Delivers:**
- Question pool management (create pools, set draw counts)
- Per-student question selection from pools (not just order shuffle)
- Answer choice randomization (defeats "A, B, C" pattern sharing)
- Question variants (same concept, different numbers/names)
- Randomization admin controls for teachers (per-quiz configuration)

**Addresses pitfalls:**
- Pitfall 7: Cheating prevention arms race (per-student selection)
- Technical debt: Single question pool per quiz is insufficient

**Architecture component:** Quiz Service enhancement with pool selection logic

**Research flag:** LOW - Randomization algorithms (Fisher-Yates) are well-established. Implementation is straightforward extension of Phase 3.

---

### Phase 5: Google Classroom Integration (Distribution)
**Rationale:** Roster sync eliminates manual student management (dealbreaker friction). Grade passback completes teacher workflow (grades must get to gradebook). Integration is complex and must be tested with real school domains, so deferred until core value proven.

**Delivers:**
- Google Classroom roster sync (import students from courses)
- Class management (link quizzes to Google Classroom courses)
- Grade passback to Classroom (async queue with retry logic)
- Grade sync confirmation UI and error handling
- Multi-account handling (teachers may have personal + school accounts)

**Addresses pitfalls:**
- Pitfall 6: Google Classroom permission labyrinth (test with real school domains)
- Pitfall 11: Grade sync silent failures (confirmation + retry)
- Anti-pattern: Direct API calls without queue (add retry logic)

**Stack elements:** googleapis, BullMQ (sync queue), OAuth token refresh handling

**Features delivered:** Table stakes - Google Classroom SSO, roster sync, grade passback

**Research flag:** MEDIUM - Google Classroom API is well-documented but has permission gotchas. Must test with real school domain accounts with admin-enabled API access.

---

### Phase 6: Dual-Tier AI & Monetization (Scale)
**Rationale:** Free tier economics require local model support. Paid tier quality requires cloud API access. Dual-tier architecture enables freemium model. Usage metering and tier enforcement needed for sustainable growth.

**Delivers:**
- AI gateway with tier-based model routing
- Free tier: Ollama local inference (Llama 3.1 7B) with usage limits
- Paid tier: OpenAI API (GPT-4o-mini) with higher quality and usage tracking
- Usage metering and rate limiting
- Pricing tiers with transparent upgrade paths
- Analytics dashboard (premium feature for paid tier)

**Addresses pitfalls:**
- Pitfall 9: Freemium death spiral (unit economics, sustainable limits)
- Pricing model: Convert on accountability (analytics), not content access

**Stack elements:** Vercel AI SDK (provider switching), Redis (rate limiting), Ollama (self-hosted)

**Research flag:** MEDIUM - Dual-tier architecture patterns documented but need cost modeling and usage tracking implementation.

---

### Phase 7: Polish & Launch (Standards, Accessibility, Analytics)
**Rationale:** District-wide adoption requires standards alignment and accessibility compliance. Detailed analytics enable teacher intervention and justify premium tier. Live quiz mode expands in-class use case.

**Delivers:**
- Standards alignment tagging (Common Core, state standards, custom)
- Filtering and search by standards
- WCAG 2.1 AA audit and remediation
- Read-aloud accessibility features
- Extended time accommodations for IEP/504
- Detailed analytics with gap analysis (misconception identification)
- Live/synchronous quiz mode (teacher-paced)
- Quiz sharing between teachers (viral growth mechanism)

**Addresses pitfalls:**
- Pitfall 10: Standards alignment as checkbox (enable filtering)
- Pitfall 12: Accessibility afterthought (audit before launch)

**Features delivered:** Competitive advantage - standards alignment, accessibility, detailed analytics, live mode

**Research flag:** LOW - Standards tagging is metadata architecture. Accessibility audit tools are standardized. Analytics patterns are established.

---

### Phase Ordering Rationale

**Why this order:**
1. **Compliance first (P1)** - Legal/privacy violations are fatal and not retrofittable. Database schema with audit trails must exist before any student data.
2. **AI core second (P2)** - Validates core technical feasibility and differentiation before UX investment. Verification pipeline is foundational, not add-on.
3. **Student experience third (P3)** - Can't validate teacher adoption without working quiz flow. Time-to-first-quiz is critical metric.
4. **Anti-cheating fourth (P4)** - Builds on Phase 3 quiz engine. Differentiator but not blocking for initial validation.
5. **Integration fifth (P5)** - Google Classroom integration is complex and requires working quiz flow first. Roster sync depends on having students to import.
6. **Monetization sixth (P6)** - Dual-tier AI and pricing strategy deferred until product-market fit validated.
7. **Polish seventh (P7)** - Standards, accessibility, advanced analytics are important but not MVP-blocking.

**Dependencies addressed:**
- Content extraction (P2) depends on file storage and auth (P1)
- Quiz taking (P3) depends on question bank from extraction (P2)
- Randomization (P4) depends on quiz engine (P3)
- Grade sync (P5) depends on grading system (P3) and Google OAuth (P1)
- Tier routing (P6) depends on basic AI pipeline (P2)
- Analytics (P7) depends on submission data (P3-P5)

**Pitfalls avoided:**
- Building features before compliance architecture (P1 blocks all)
- Trusting AI extraction without verification (P2 verification before scale)
- Scaling before UX validation (P3 validates time-to-first-quiz)
- Delaying anti-cheating to post-launch (P4 in MVP)
- Integrating before core value proven (P5 after quiz engine works)

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 2 (AI Extraction):** RAG architecture is well-documented but hallucination prevention needs experimentation. Grounding verification thresholds need tuning. Teacher approval UX needs validation with real teachers. Recommend `/gsd:research-phase` for RAG implementation patterns and verification strategies.
- **Phase 5 (Google Classroom):** API documentation is complete but permission gotchas are domain-specific. School admin requirements vary by district. Must test with real school domains before launch. Recommend `/gsd:research-phase` for integration testing strategy and error handling patterns.
- **Phase 6 (Dual-Tier AI):** Cost modeling for free tier requires usage estimation. Ollama deployment and scaling patterns need infrastructure research. Recommend `/gsd:research-phase` for cost analysis and infrastructure planning.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Auth and database patterns are well-established. Compliance documentation needs legal review (not technical research).
- **Phase 3 (Quiz Engine):** Quiz builder and grading workflows are standard EdTech patterns. No novel technical challenges.
- **Phase 4 (Anti-Cheating):** Randomization algorithms (Fisher-Yates) and pool selection are well-documented.
- **Phase 7 (Polish):** Standards tagging is metadata work. Accessibility audit uses standard WCAG guidelines.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official documentation for all recommended technologies. Next.js 16 stable release, Prisma 7 released, AI SDK 6 production-ready. Auth.js v5 in beta but production-stable. |
| Features | HIGH | Verified across multiple competitor analyses (Kahoot, Quizlet, Quizizz). Teacher pain points documented in primary research. Anti-cheating statistics from authoritative sources. |
| Architecture | MEDIUM-HIGH | RAG patterns well-documented but hallucination prevention requires experimentation. Service separation patterns are standard. Google Classroom integration has documented gotchas. |
| Pitfalls | HIGH | COPPA/FERPA legal landscape verified from law firm publications. AI hallucination research from IEEE/academic papers. Teacher adoption patterns from EdTech research firms. Copyright fair use from Stanford/UChicago legal centers. |

**Overall confidence:** HIGH

Research quality is strong across all areas. Stack recommendations verified from official documentation and recent release announcements. Feature expectations validated from competitor reviews and teacher surveys. Architecture patterns drawn from established EdTech platforms (Moodle, Classloom) and AI research. Pitfalls verified from legal publications, academic research, and EdTech deployment case studies.

### Gaps to Address

**Gaps identified during research:**

1. **Copyright fair use legal review** - Research provides framework (four-factor test, transformative use) but specific application to QuizSwift's extraction approach needs attorney review before launch. Fair use is context-dependent and case-law driven, not formulaic. **Handle:** Legal consultation in Phase 1 before any content extraction goes to users.

2. **Auth.js v5 production stability** - Recommended despite beta status because widely used, but breaking changes possible before stable release. **Handle:** Monitor Auth.js release notes and Discord. Budget time in Phase 1 for potential migration if v5 breaking changes occur. v4.24.13 is fallback option (stable but older patterns).

3. **Ollama production deployment** - Research confirms feasibility but scaling patterns for 1K+ concurrent users not well-documented. Free tier economics depend on local model performance. **Handle:** Load testing in Phase 6 with realistic teacher usage patterns. Consider vLLM as alternative if Ollama doesn't scale.

4. **Teacher onboarding best practices** - Research identifies "time-to-first-quiz under 5 minutes" metric but specific UX patterns need validation with real teachers. **Handle:** User testing sessions in Phase 3 with 5-10 K-12 teachers before feature expansion. Iterate on onboarding flow based on observed friction points.

5. **Google Classroom domain admin requirements** - Research confirms admin must enable API access but process varies by district. Some districts lock down API access entirely. **Handle:** Create district onboarding checklist in Phase 5. Document admin setup steps with screenshots. Consider fallback CSV upload if API blocked.

6. **Question pool sizing for anti-cheating** - Research recommends per-student selection from pools but optimal pool size (ratio of pool questions to selected questions) not specified. **Handle:** Experimentation in Phase 4. Start with conservative ratio (pool of 30, select 10) and adjust based on teacher feedback about variety vs. content coverage.

**No critical unknowns remain.** All gaps have mitigation strategies identified. None block immediate progress on Phase 1.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Next.js 16 Release](https://nextjs.org/blog/next-16) - App Router, Server Components, React 19 support
- [Prisma 7 Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0) - Pure TypeScript rewrite, performance improvements
- [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6) - Provider abstraction, streaming support
- [Google Classroom API Quickstart](https://developers.google.com/classroom/quickstart/nodejs) - Authentication, roster sync, grade passback
- [Auth.js v5 Migration](https://authjs.dev/getting-started/migrating-to-v5) - NextAuth evolution, Edge compatibility
- [Ollama JavaScript Library](https://github.com/ollama/ollama-js) - Local LLM inference, structured outputs
- [KaTeX Documentation](https://katex.org/) - Math rendering, SSR support

**Legal & Compliance:**
- [McDermott: EdTech and Privacy - A Shifting Regulatory Landscape](https://www.mwe.com/insights/edtech-and-privacy-navigating-a-shifting-regulatory-landscape/) - COPPA 2025 amendments
- [Loeb & Loeb: Children's Online Privacy in 2025](https://www.loeb.com/en/insights/publications/2025/05/childrens-online-privacy-in-2025-the-amended-coppa-rule) - April 2026 effective date
- [UpGuard: FERPA Compliance Guide](https://www.upguard.com/blog/ferpa-compliance-guide) - School vs vendor responsibilities
- [Stanford Fair Use Center: Educational Uses](https://fairuse.stanford.edu/overview/academic-and-educational-permissions/non-coursepack/) - Four-factor test application
- [UChicago Library: Fair Use](https://www.lib.uchicago.edu/copyrightinfo/fairuse.html) - Copyright in education context

**AI & Hallucination Research:**
- [Infomineo: Stop AI Hallucinations Guide 2025](https://infomineo.com/artificial-intelligence/stop-ai-hallucinations-detection-prevention-verification-guide-2025/) - Verification strategies
- [Morphik: 7 Proven Methods to Eliminate AI Hallucinations](https://www.morphik.ai/blog/eliminate-hallucinations-guide) - Multi-stage verification
- [NVIDIA: What Is Retrieval-Augmented Generation](https://blogs.nvidia.com/blog/what-is-retrieval-augmented-generation/) - RAG architecture patterns
- [MEGA-RAG Framework - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12540348/) - Medical domain RAG (applicable to education)

### Secondary (MEDIUM confidence)

**Competitor Analysis:**
- [Kahoot vs Quizlet Comparison](https://www.theprotec.com/blog/2025/kahoot-vs-quizlet-which-quiz-tool-wins-for-classrooms/) - Feature comparison
- [Kahoot vs Quizizz Ultimate Guide 2026](https://triviamaker.com/kahoot-vs-quizziz/) - Market positioning
- [Common Sense Education Reviews](https://www.commonsense.org/education/reviews/) - Teacher feedback on platforms
- [Quizizz 2026 Guide - Wayground Rebrand](https://classroom-15x.com/2025/12/17/quizizz/) - Feature updates

**EdTech Architecture:**
- [Classloom: Building a Modern Learning Platform](https://classloom.com/2025/10/31/building-a-modern-learning-platform-architecture-and-implementation-secrets/) - Service-oriented architecture
- [FastPix: E-learning Platform System Design](https://www.fastpix.io/blog/site-architecture-and-system-design-for-an-e-learning-platform) - Scaling patterns
- [Magic EdTech: Building Scalable K-12 Systems](https://www.magicedtech.com/blogs/how-to-build-scalable-and-trustworthy-edtech-infrastructure/) - Compliance architecture

**Teacher Needs & Adoption:**
- [EdTech Innovation Hub: Four Common EdTech Deployment Mistakes](https://www.edtechinnovationhub.com/news/four-common-edtech-deployment-mistakes) - Adoption barriers
- [Edutopia: Common EdTech Mistakes](https://www.edutopia.org/article/common-edtech-mistakes-how-schools-can-avoid/) - Teacher training gap
- [Tech Learning: What Works in K-12 EdTech 2025](https://www.techlearning.com/news/what-works-what-doesnt-and-how-to-tell-the-data-that-should-drive-k-12-edtech-decisions-in-2025-26) - Data-driven decisions

**Sales & Procurement:**
- [Leoni Consulting: Q2 2025 EdTech Buying Cycle](https://www.leoniconsultinggroup.com/blog/q2-2025-edtech-marketing-planning) - School budget calendar
- [Catapult X: K-12 District Sales Cycle](https://www.catapult-x.com/k-12-district-sales-cycle/) - 9-18 month cycles
- [Winsome Marketing: School District Procurement](https://winsomemarketing.com/edtech-marketing/school-district-procurement-marketing-to-committees-not-individuals) - Stakeholder dynamics

**Anti-Cheating:**
- [TestInvite: Question Randomization Techniques](https://www.testinvite.com/dy/en/pages/blog/question-randomization-prevent-cheating-online-exams) - Per-student selection
- [TCSG: Design Cheat-Resistant Assessments](https://online.tcsg.edu/training/design-cheat-resistant-assessments/) - Best practices
- [HackerEarth: Online Test Cheating Prevention](https://www.hackerearth.com/blog/online-test-cheating-prevention-tools) - Tool comparison

### Tertiary (LOW confidence)

**Integration Gotchas:**
- [Google: Classroom API Error Messages](https://developers.google.com/workspace/classroom/troubleshooting/common-errors) - Permission issues
- [Google: Classroom API Known Issues](https://developers.google.com/workspace/classroom/add-ons/developer-guides/known-issues) - Token expiration
- [Edlink: Google Classroom Integration](https://ed.link/community/where-to-start-with-google-classroom-integration/) - Community guidance

**Freemium Models:**
- [Winsome Marketing: Freemium Models in EdTech](https://winsomemarketing.com/edtech-marketing/freemium-models-in-edtech-when-free-users-actually-convert-to-paid) - 1-5% conversion rates
- [EdTech Digest: The True Cost of Freemiums](https://www.edtechdigest.com/2019/02/05/the-true-cost-of-freemiums/) - Unit economics

---

*Research completed: 2025-01-23*
*Ready for roadmap: YES*

**Next step:** Roadmapper agent can use this synthesis to structure detailed phase plans with confidence. Critical dependencies identified, pitfall mitigation strategies documented, technology choices justified.
