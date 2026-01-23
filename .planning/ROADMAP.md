# Roadmap: QuizSwift

**Created:** 2025-01-23
**Phases:** 8
**Requirements:** 47 mapped
**Depth:** Comprehensive

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation & Compliance | Teachers can sign in securely with compliance infrastructure in place | AUTH-01, AUTH-04, PLAT-01, PLAT-02, PLAT-03, PLAT-04 | 4 |
| 2 | Content & AI Extraction | Teachers can upload textbooks and receive accurately extracted questions | CONT-01, CONT-02, CONT-03, CONT-04, CONT-05 | 4 |
| 3 | Question Bank & Teacher Workflow | Teachers can review, edit, and approve extracted questions for use | CONT-06, CONT-07, CONT-08, QUES-01, QUES-02, QUES-03, QUES-04, QUES-05, QUES-06, QUES-07 | 5 |
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
- [ ] 01-01-PLAN.md - Next.js 16 project setup with Prisma 7 and PostgreSQL schema
- [ ] 01-02-PLAN.md - Auth.js v5 Google OAuth with database sessions
- [ ] 01-03-PLAN.md - PostgreSQL audit triggers for FERPA compliance
- [ ] 01-04-PLAN.md - Data deletion, DPA template, and audit log UI
- [ ] 01-05-PLAN.md - End-to-end verification of all Phase 1 requirements

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

**Research Notes:** Multi-stage verification pipeline prevents hallucinations: extract, generate, verify grounding, confidence score. RAG architecture with FAISS vector store. Async processing via job queue to avoid timeouts.

---

## Phase 3: Question Bank & Teacher Workflow

**Goal:** Teachers can review, edit, and approve extracted questions across all question types before students see them.

**Requirements:**
- CONT-06: Teacher must take the quiz before approving it
- CONT-07: Teacher can edit extracted questions before publishing
- CONT-08: Questions stored in question bank for reuse
- QUES-01: Multiple choice (2-6 options)
- QUES-02: True/false
- QUES-03: Fill-in-the-blank
- QUES-04: Matching
- QUES-05: Show-your-work (math/science)
- QUES-06: Essay/short answer
- QUES-07: Image support in questions

**Success Criteria:**
1. Teacher can take an extracted quiz and experience it exactly as students will
2. Teacher can edit any question text, answers, or source citation before publishing
3. Teacher can browse question bank, filter by source document, and add questions to new quizzes
4. Teacher can create questions of all 7 types (MC, T/F, fill-blank, matching, show-work, essay, image-based)
5. Questions with images render correctly in preview and quiz modes

**Dependencies:** Phase 2 (extraction pipeline, question storage)

**Research Notes:** Teacher-takes-quiz workflow builds trust and catches bad extractions. Question bank enables reuse across multiple quizzes and semesters.

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
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 7 | Pending |
| AUTH-03 | Phase 7 | Pending |
| AUTH-04 | Phase 1 | Pending |
| CONT-01 | Phase 2 | Pending |
| CONT-02 | Phase 2 | Pending |
| CONT-03 | Phase 2 | Pending |
| CONT-04 | Phase 2 | Pending |
| CONT-05 | Phase 2 | Pending |
| CONT-06 | Phase 3 | Pending |
| CONT-07 | Phase 3 | Pending |
| CONT-08 | Phase 3 | Pending |
| QUES-01 | Phase 3 | Pending |
| QUES-02 | Phase 3 | Pending |
| QUES-03 | Phase 3 | Pending |
| QUES-04 | Phase 3 | Pending |
| QUES-05 | Phase 3 | Pending |
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
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |
| PLAT-04 | Phase 1 | Pending |
| PLAT-05 | Phase 8 | Pending |
| TIER-01 | Phase 8 | Pending |
| TIER-02 | Phase 8 | Pending |
| TIER-03 | Phase 8 | Pending |
| TIER-04 | Phase 8 | Pending |

## Coverage Summary

- v1 requirements: 47
- Mapped: 47
- Unmapped: 0

**Phase Distribution:**
- Phase 1: 6 requirements (Foundation & Compliance)
- Phase 2: 5 requirements (Content & AI Extraction)
- Phase 3: 10 requirements (Question Bank & Teacher Workflow)
- Phase 4: 5 requirements (Quiz Delivery & Student Experience)
- Phase 5: 2 requirements (Anti-Cheating & Randomization)
- Phase 6: 7 requirements (Grading & Analytics)
- Phase 7: 7 requirements (Google Classroom Integration)
- Phase 8: 5 requirements (Dual-Tier AI & Polish)

---

## Phase Dependencies Graph

```
Phase 1 (Foundation)
    |
    v
Phase 2 (Content & AI) -----> Phase 8 (Dual-Tier AI)
    |
    v
Phase 3 (Question Bank)
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

**Critical Path:** 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

**Parallel Opportunity:** Phase 8 can begin after Phase 2 (AI pipeline exists)

---

*Roadmap created: 2025-01-23*
*Phase 1 planned: 2025-01-23*
*Next step: /gsd:execute-phase 1*
