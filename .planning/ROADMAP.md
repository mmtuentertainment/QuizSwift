# Roadmap: QuizSwift

**Created:** 2025-01-23
**Phases:** 11 (including 2.1, 3.1, and 3.2)
**Requirements:** 47 mapped + 5 new
**Depth:** Comprehensive

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation & Compliance | Teachers can sign in securely with compliance infrastructure in place | AUTH-01, AUTH-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04 | 4 |
| 2 | Content & AI Extraction | Teachers can upload textbooks and receive accurately extracted questions | CONT-01, CONT-02, CONT-03, CONT-04, CONT-05 | 4 |
| 2.1 | Intelligent Question Curation | AI generates pedagogically-sound comprehension questions with teacher selection | CONT-04-ENH, QUES-05-EARLY, CUR-01, CUR-02, CUR-03 | 5 |
| 3 | Question Bank & Teacher Workflow | Teachers can review, edit, and approve extracted questions for use | CONT-06, CONT-07, CONT-08, QUES-01, QUES-02, QUES-03, QUES-04, QUES-06, QUES-07 | 5 |
| 3.1 | Convert Prisma Status Enums | Database-level type safety for status fields | TECH-DEBT-01, TECH-DEBT-02, TECH-DEBT-03 | 5 |
| 3.2 | Centralize QuestionType Definition | Single source of truth for question types | TECH-DEBT-04, TECH-DEBT-05, TECH-DEBT-06 | 6 |
| 4 | Quiz Delivery & Student Experience | Students can take quizzes on any device with clear progress tracking | DELV-01, DELV-04, DELV-05, DELV-06, DELV-07 | 4 |
| 5 | Anti-Cheating & Randomization | Each student receives a unique quiz experience to prevent answer sharing | DELV-02, DELV-03 | 3 |
| 6 | Grading & Analytics | Teachers can review auto-graded results and gain insights into student performance | GRAD-01, GRAD-02, GRAD-03, GRAD-04, GRAD-05, GRAD-06, GRAD-07 | 5 |
| 7 | Google Classroom Integration | Teachers can sync rosters and grades seamlessly with Google Classroom | AUTH-02, AUTH-03, GOOG-01, GOOG-02, GOOG-03, GOOG-04, GOOG-05 | 4 |
| 8 | Dual-Tier AI & Polish | Platform supports sustainable free tier with clear upgrade path and accessibility compliance | TIER-01, TIER-02, TIER-03, TIER-04, PLAT-05 | 4 |

---

## Phase 1: Foundation & Compliance

**Goal:** Teachers can sign in securely with compliance infrastructure in place from day one.

**Plans:** 5 plans

Plans:
- [x] 01-01-PLAN.md - Next.js 16 project setup with Prisma 7 and PostgreSQL schema
- [x] 01-02-PLAN.md - Auth.js v5 Google OAuth with database sessions
- [x] 01-03-PLAN.md - PostgreSQL audit triggers for FERPA compliance
- [x] 01-04-PLAN.md - Data deletion, DPA template, and audit log UI
- [x] 01-05-PLAN.md - End-to-end verification of all Phase 1 requirements

**Requirements:**
- AUTH-01: Teacher can sign in with Google OAuth (SSO)
- AUTH-04: User sessions persist across browser refresh
- PLAT-01: COPPA-compliant (school consent model)
- PLAT-02: FERPA-ready with audit logging
- PLAT-03: DPA template for districts
- PLAT-04: Data deletion mechanism

**Success Criteria:**
1. Teacher can sign in with their Google account and see a dashboard
2. Teacher can close browser, return later, and remain logged in
3. School administrator can download a Data Processing Agreement template
4. Any user data access is logged in an audit trail queryable by date/user

**Dependencies:** None

**Research Notes:** COPPA/FERPA compliance is not retrofittable. Database schema must support audit trails and row-level security before any student data enters the system. Legal review needed for DPA template.

---

## Phase 2: Content & AI Extraction

**Goal:** Teachers can upload textbook chapters and receive accurately extracted quiz questions with source citations.

**Status:** COMPLETE

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md - Database schema for documents/chunks/questions and Vercel Blob storage
- [x] 02-02-PLAN.md - PDF text extraction with unpdf and Tesseract.js OCR
- [x] 02-03-PLAN.md - Inngest background job processing pipeline
- [x] 02-04-PLAN.md - AI question extraction with grounding verification
- [x] 02-05-PLAN.md - Upload UI, document pages, and E2E verification

**Requirements:**
- CONT-01: Teacher can upload PDF files (textbook chapters)
- CONT-02: System extracts text from text-native PDFs
- CONT-03: System performs OCR on scanned/image-based PDFs
- CONT-04: AI extracts quiz questions from uploaded content (extraction-only)
- CONT-05: Every extracted question includes source citation

**Success Criteria:**
1. Teacher can upload a PDF and see extraction progress indicator
2. System processes both text-native and scanned PDFs successfully
3. Teacher sees extracted questions with page/section citations linking back to source
4. Extraction rejects or flags questions that cannot be verified against source text

**Dependencies:** Phase 1 (authentication, database with audit logging)

**Research Notes:** Multi-stage verification pipeline prevents hallucinations: extract, generate, verify grounding, confidence score. RAG architecture with pgvector. Async processing via Inngest to avoid timeouts.

---

## Phase 2.1: Intelligent Question Curation

**Goal:** Replace chunk-by-chunk extraction with a pedagogically-sound 5-pass reasoning pipeline that generates comprehension questions and allows teacher selection from a curated pool.

**Status:** COMPLETE

**Plans:** 6 plans

Plans:
- [x] 02.1-01-PLAN.md - Schema updates and upload UI question count input
- [x] 02.1-02-PLAN.md - Zod schemas for 5-pass reasoning pipeline
- [x] 02.1-03-PLAN.md - 5-pass reasoning pipeline implementation
- [x] 02.1-04-PLAN.md - Inngest curation job replacing extraction
- [x] 02.1-05-PLAN.md - Show-your-work canvas with tldraw and KaTeX
- [x] 02.1-06-PLAN.md - Teacher curation UI for question selection

**Requirements:**
- CONT-04-ENH: AI generates comprehension questions (not just extraction) following Bloom's Taxonomy
- QUES-05-EARLY: Show-your-work questions with canvas (pulled forward from Phase 3)
- CUR-01: Teacher specifies desired question count when uploading
- CUR-02: AI generates 2x requested count for teacher selection
- CUR-03: 5-pass reasoning pipeline (analyze -> concepts -> generate -> evaluate -> select)

**Success Criteria:**
1. Teacher can specify question count (5-50) when uploading
2. AI reads full document and reasons about content before generating questions
3. Generated questions test comprehension using Bloom's Taxonomy distribution
4. Teacher sees 2x questions with quality scores and can select final set
5. Show-your-work questions render with drawing canvas and math support

**Dependencies:** Phase 2 (PDF processing, chunk storage, Inngest infrastructure)

**Research Notes:**
- 5 sequential generateText calls with structured output
- Bloom's distribution: Understand 40%, Apply 30%, Analyze 20%, Evaluate 10%
- Use tldraw for canvas, KaTeX for math rendering
- Qwen3:8b needs custom Modelfile with num_ctx 32768 for full document context

---

## Phase 3: Question Bank & Teacher Workflow

**Goal:** Teachers can review, edit, and approve extracted questions across all question types before students see them.

**Plans:** 9 plans

Plans:
- [ ] 03-01-PLAN.md - Database models (Quiz, QuizQuestion, QuizAttempt, QuestionAnswer) and TypeScript types
- [ ] 03-02-PLAN.md - Question type components (MC, T/F, fill-blank, essay)
- [ ] 03-03-PLAN.md - Matching questions with @dnd-kit drag-and-drop
- [ ] 03-04-PLAN.md - Quiz creation workflow and Server Actions
- [ ] 03-05-PLAN.md - Quiz-taking flow with auto-grading and teacher preview
- [ ] 03-06-PLAN.md - Quiz detail page, question editing, and publish workflow
- [ ] 03-07-PLAN.md - Question bank browse page with filters
- [ ] 03-08-PLAN.md - Image upload support for questions
- [ ] 03-09-PLAN.md - Integration, navigation, and human verification

**Requirements:**
- CONT-06: Teacher must take the quiz before approving it
- CONT-07: Teacher can edit extracted questions before publishing
- CONT-08: Questions stored in question bank for reuse
- QUES-01: Multiple choice (2-6 options)
- QUES-02: True/false
- QUES-03: Fill-in-the-blank
- QUES-04: Matching
- ~~QUES-05: Show-your-work (math/science)~~ (Moved to Phase 2.1)
- QUES-06: Essay/short answer
- QUES-07: Image support in questions

**Success Criteria:**
1. Teacher can take an extracted quiz and experience it exactly as students will
2. Teacher can edit any question text, answers, or source citation before publishing
3. Teacher can browse question bank, filter by source document, and add questions to new quizzes
4. Teacher can create questions of all 7 types (MC, T/F, fill-blank, matching, show-work, essay, image-based)
5. Questions with images render correctly in preview and quiz modes

**Dependencies:** Phase 2.1 (curation pipeline, curated question storage)

**Research Notes:** Teacher-takes-quiz workflow builds trust and catches bad extractions. Question bank enables reuse across multiple quizzes and semesters.

---

## Phase 3.1: Convert Prisma Status Fields to Enums (INSERTED)

**Goal:** Convert string-based status fields to proper Prisma enums for database-level constraints and TypeScript type safety.

**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 3.1 to break down)

**Requirements:**
- TECH-DEBT-01: Quiz.status field uses enum instead of string with comments
- TECH-DEBT-02: Quiz.showResults field uses enum instead of string with comments
- TECH-DEBT-03: QuizAttempt.status field uses enum instead of string with comments

**Success Criteria:**
1. Database rejects invalid status values at PostgreSQL level
2. Prisma client exports typed enum values (QuizStatus, QuizShowResults, AttemptStatus)
3. All existing string comparisons migrated to enum comparisons
4. Existing data migrated without data loss
5. All tests pass after migration

**Dependencies:** Phase 3 completion (uses Quiz and QuizAttempt models extensively)

**Research Notes:** Prisma enum migration with existing data requires careful SQL migration planning. Need to handle default values and ensure rollback strategy exists.

---

## Phase 3.2: Centralize QuestionType Definition (INSERTED)

**Goal:** Create a single source of truth for QuestionType to eliminate duplicate definitions and improve type safety across the codebase.

**Plans:** 1 plan

Plans:
- [ ] 03.2-01-PLAN.md - Add QUESTION_TYPES const, QuestionType type, and update consumers

**Requirements:**
- TECH-DEBT-04: QuestionType defined once in src/lib/questions/types.ts
- TECH-DEBT-05: grading.ts uses QuestionType instead of string parameter
- TECH-DEBT-06: question-renderer.tsx imports QuestionType instead of defining locally

**Success Criteria:**
1. Single QUESTION_TYPES const array as canonical source in types.ts
2. QuestionType derived from const array (typeof QUESTION_TYPES[number])
3. Type guard isValidQuestionType() validates strings from database/API
4. grading.ts parameter changed from string to QuestionType
5. question-renderer.tsx imports type instead of defining locally
6. All existing tests pass (grading.test.ts, validation.test.ts)

**Dependencies:** Phase 3 completion (question types fully implemented)

**Research Notes:** Current state has QuestionType defined in question-renderer.tsx and grading.ts accepts any string. This creates maintenance burden and bypasses compile-time type checking. Consolidation follows existing type guard patterns in types.ts.

---

## Phase 4: Quiz Delivery & Student Experience

**Goal:** Students can take self-paced quizzes on any device with clear progress tracking and answer review.

**Requirements:**
- DELV-01: Self-paced mode with deadline
- DELV-04: Optional timer per quiz
- DELV-05: Mobile-responsive interface
- DELV-06: Progress indicator during quiz
- DELV-07: Review answers before submission

**Success Criteria:**
1. Student can start a quiz and complete it anytime before the deadline
2. Teacher can set a time limit that displays countdown during quiz
3. Quiz interface adapts correctly to phone, tablet, and desktop screens
4. Student can review all answers and navigate back to change responses before final submission

**Dependencies:** Phase 3 (question bank, question types, teacher approval)

**Research Notes:** Time-to-first-quiz under 5 minutes is critical adoption metric. Mobile-responsive is non-negotiable (students use phones). Progress indicator reduces anxiety and abandonment.

---

## Phase 5: Anti-Cheating & Randomization

**Goal:** Each student receives a unique quiz experience through question and answer randomization to prevent answer sharing.

**Requirements:**
- DELV-02: Per-student question ORDER randomization
- DELV-03: Per-student answer choice randomization

**Success Criteria:**
1. Two students taking the same quiz see questions in different orders
2. Multiple choice options (A, B, C, D) are shuffled differently per student
3. Student's randomized order remains consistent across sessions (deterministic seed)

**Dependencies:** Phase 4 (quiz delivery infrastructure)

**Research Notes:** 54.7% of online assessments experience cheating. Per-student randomization defeats screenshot and "the answer is B" sharing. Server-side Fisher-Yates with deterministic seed ensures consistency.

---

## Phase 6: Grading & Analytics

**Goal:** Teachers can review auto-graded results, adjust scores, and gain insights into which concepts students struggle with.

**Requirements:**
- GRAD-01: Auto-grading for objective questions
- GRAD-02: Grades pending until teacher approves
- GRAD-03: Teacher sees full quiz with student answers
- GRAD-04: Teacher can adjust scores before approval
- GRAD-05: Per-student and per-question analytics
- GRAD-06: Highlight struggling questions
- GRAD-07: Export to PDF/CSV

**Success Criteria:**
1. Objective questions (MC, T/F, fill-blank, matching) are auto-scored immediately upon submission
2. Grades remain in "pending review" state until teacher explicitly approves
3. Teacher can view any student's complete quiz with their answers alongside correct answers
4. Teacher can export class results to PDF or CSV for gradebook/records
5. Analytics dashboard highlights which questions had lowest success rates

**Dependencies:** Phase 4 (quiz submission), Phase 5 (consistent randomization for review)

**Research Notes:** Explicit grade state machine: ungraded -> auto_scored -> pending_review -> approved -> synced. Source attribution in grading view builds trust. Easy override mechanism for edge cases.

---

## Phase 7: Google Classroom Integration

**Goal:** Teachers can sync class rosters and push approved grades seamlessly to Google Classroom.

**Requirements:**
- AUTH-02: Teacher can create and manage classroom profiles
- AUTH-03: Students imported automatically from Google Classroom roster
- GOOG-01: Link to Google Classroom courses
- GOOG-02: Roster sync from Classroom
- GOOG-03: Push quiz as Classroom assignment
- GOOG-04: Grade passback to Classroom gradebook
- GOOG-05: Sync confirmation and error handling

**Success Criteria:**
1. Teacher can link QuizSwift classroom to their Google Classroom course
2. Student roster imports automatically without manual entry
3. Teacher can push a quiz to appear as a Classroom assignment with link
4. Approved grades sync to Classroom gradebook with confirmation message

**Dependencies:** Phase 1 (Google OAuth), Phase 6 (approved grades to sync)

**Research Notes:** Must test with real school domain accounts, not @gmail.com. Admin must enable Classroom API access. Async queue with retry logic for grade sync. Handle token refresh gracefully.

---

## Phase 8: Dual-Tier AI & Polish

**Goal:** Platform supports sustainable free tier with local AI, premium cloud AI tier, and meets accessibility standards for district adoption.

**Requirements:**
- TIER-01: Free tier uses local AI model (Ollama)
- TIER-02: Paid tier uses cloud AI (OpenAI)
- TIER-03: Free tier has monthly quiz limit
- TIER-04: Clear upgrade path
- PLAT-05: WCAG 2.1 AA accessibility

**Success Criteria:**
1. Free tier users can generate quizzes using local Ollama model
2. Paid tier users receive higher quality extractions from OpenAI
3. Free tier displays usage limits and shows clear upgrade prompt when approaching limit
4. Platform passes WCAG 2.1 AA audit (keyboard navigation, screen reader, contrast)

**Dependencies:** Phase 2 (AI extraction pipeline to route)

**Research Notes:** Dual-tier AI gateway routes based on subscription. Ollama (Llama 3.1 7B) for free tier keeps unit economics sustainable. EdTech conversion is 1-5%, so free tier must be genuinely useful to drive adoption.

---

## Traceability Matrix

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 7 | Pending |
| AUTH-03 | Phase 7 | Pending |
| AUTH-04 | Phase 1 | Complete |
| CONT-01 | Phase 2 | Complete |
| CONT-02 | Phase 2 | Complete |
| CONT-03 | Phase 2 | Complete |
| CONT-04 | Phase 2 | Complete |
| CONT-04-ENH | Phase 2.1 | Complete |
| CONT-05 | Phase 2 | Complete |
| CONT-06 | Phase 3 | Pending |
| CONT-07 | Phase 3 | Pending |
| CONT-08 | Phase 3 | Pending |
| CUR-01 | Phase 2.1 | Complete |
| CUR-02 | Phase 2.1 | Complete |
| CUR-03 | Phase 2.1 | Complete |
| QUES-01 | Phase 3 | Pending |
| QUES-02 | Phase 3 | Pending |
| QUES-03 | Phase 3 | Pending |
| QUES-04 | Phase 3 | Pending |
| QUES-05 | Phase 2.1 | Complete |
| QUES-06 | Phase 3 | Pending |
| QUES-07 | Phase 3 | Pending |
| DELV-01 | Phase 4 | Pending |
| DELV-02 | Phase 5 | Pending |
| DELV-03 | Phase 5 | Pending |
| DELV-04 | Phase 4 | Pending |
| DELV-05 | Phase 4 | Pending |
| DELV-06 | Phase 4 | Pending |
| DELV-07 | Phase 4 | Pending |
| GRAD-01 | Phase 6 | Pending |
| GRAD-02 | Phase 6 | Pending |
| GRAD-03 | Phase 6 | Pending |
| GRAD-04 | Phase 6 | Pending |
| GRAD-05 | Phase 6 | Pending |
| GRAD-06 | Phase 6 | Pending |
| GRAD-07 | Phase 6 | Pending |
| GOOG-01 | Phase 7 | Pending |
| GOOG-02 | Phase 7 | Pending |
| GOOG-03 | Phase 7 | Pending |
| GOOG-04 | Phase 7 | Pending |
| GOOG-05 | Phase 7 | Pending |
| PLAT-01 | Phase 1 | Complete |
| PLAT-02 | Phase 1 | Complete |
| PLAT-03 | Phase 1 | Complete |
| PLAT-04 | Phase 1 | Complete |
| PLAT-05 | Phase 8 | Pending |
| TIER-01 | Phase 8 | Pending |
| TIER-02 | Phase 8 | Pending |
| TIER-03 | Phase 8 | Pending |
| TIER-04 | Phase 8 | Pending |

## Coverage Summary

- v1 requirements: 47
- New requirements: 5 (CUR-01, CUR-02, CUR-03, CONT-04-ENH, QUES-05 moved)
- Mapped: 52
- Unmapped: 0

**Phase Distribution:**
- Phase 1: 6 requirements (Foundation & Compliance) - COMPLETE
- Phase 2: 5 requirements (Content & AI Extraction) - COMPLETE
- Phase 2.1: 5 requirements (Intelligent Question Curation) - COMPLETE
- Phase 3: 9 requirements (Question Bank & Teacher Workflow) - PLANNED
- Phase 3.2: 3 requirements (Centralize QuestionType) - PLANNED
- Phase 4: 5 requirements (Quiz Delivery & Student Experience)
- Phase 5: 2 requirements (Anti-Cheating & Randomization)
- Phase 6: 7 requirements (Grading & Analytics)
- Phase 7: 7 requirements (Google Classroom Integration)
- Phase 8: 5 requirements (Dual-Tier AI & Polish)

---

## Phase Dependencies Graph

```
Phase 1 (Foundation) - COMPLETE
    |
    v
Phase 2 (Content & AI) - COMPLETE -----> Phase 8 (Dual-Tier AI)
    |
    v
Phase 2.1 (Intelligent Curation) - COMPLETE
    |
    v
Phase 3 (Question Bank) - IN PROGRESS
    |
    v
Phase 3.1 (Prisma Enums) - INSERTED
    |
    v
Phase 3.2 (QuestionType) - PLANNED
    |
    v
Phase 4 (Quiz Delivery)
    |
    v
Phase 5 (Anti-Cheating)
    |
    v
Phase 6 (Grading) ---------> Phase 7 (Google Classroom)
```

**Critical Path:** 1 -> 2 -> 2.1 -> 3 -> 3.1 -> 3.2 -> 4 -> 5 -> 6 -> 7

**Parallel Opportunity:** Phase 8 can begin after Phase 2 (AI pipeline exists)

---

*Roadmap created: 2025-01-23*
*Phase 1 completed: 2026-01-23*
*Phase 2 completed: 2026-01-23*
*Phase 2.1 completed: 2026-01-25*
*Phase 3 planned: 2026-01-26*
*Phase 3.2 planned: 2026-01-27*
*Next step: /gsd:execute-phase 3.2*
