# Requirements: QuizSwift

**Defined:** 2025-01-23
**Core Value:** 100% factual accuracy — every question extracted from source material, never generated

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [ ] **AUTH-01**: Teacher can sign in with Google OAuth (SSO)
- [ ] **AUTH-02**: Teacher can create and manage classroom profiles
- [ ] **AUTH-03**: Students imported automatically from Google Classroom roster
- [ ] **AUTH-04**: User sessions persist across browser refresh

### Content & Extraction

- [ ] **CONT-01**: Teacher can upload PDF files (textbook chapters)
- [ ] **CONT-02**: System extracts text from text-native PDFs
- [ ] **CONT-03**: System performs OCR on scanned/image-based PDFs
- [ ] **CONT-04**: AI extracts quiz questions from uploaded content (extraction-only, not generation)
- [ ] **CONT-05**: Every extracted question includes source citation (page/section reference)
- [ ] **CONT-06**: Teacher must take the quiz before approving it for students
- [ ] **CONT-07**: Teacher can edit extracted questions before publishing
- [ ] **CONT-08**: Questions stored in teacher's question bank for reuse

### Question Types

- [ ] **QUES-01**: Multiple choice questions with 2-6 answer options
- [ ] **QUES-02**: True/false questions
- [ ] **QUES-03**: Fill-in-the-blank questions with text input
- [ ] **QUES-04**: Matching questions (pair items from two columns)
- [ ] **QUES-05**: Show-your-work questions (math/science with work area)
- [ ] **QUES-06**: Essay/short answer questions with text area
- [ ] **QUES-07**: Questions can include images (extracted from source or uploaded)

### Quiz Delivery

- [ ] **DELV-01**: Self-paced quiz mode (students complete on own time with deadline)
- [ ] **DELV-02**: Per-student question ORDER randomization (same questions, different sequence)
- [ ] **DELV-03**: Per-student answer choice randomization (A/B/C/D shuffled per student)
- [ ] **DELV-04**: Optional timer per quiz (teacher sets time limit)
- [ ] **DELV-05**: Mobile-responsive student quiz interface
- [ ] **DELV-06**: Students see progress indicator during quiz
- [ ] **DELV-07**: Students can review answers before final submission

### Grading & Results

- [ ] **GRAD-01**: Auto-grading for objective questions (MC, T/F, fill-blank, matching)
- [ ] **GRAD-02**: Grades remain pending until teacher reviews and approves
- [ ] **GRAD-03**: Teacher sees full quiz with each student's answers
- [ ] **GRAD-04**: Teacher can adjust auto-graded scores before approval
- [ ] **GRAD-05**: Results dashboard shows per-student and per-question analytics
- [ ] **GRAD-06**: Analytics highlight which questions students struggled with
- [ ] **GRAD-07**: Export grades and results to PDF or CSV

### Google Classroom Integration

- [ ] **GOOG-01**: Teacher can link QuizSwift to their Google Classroom courses
- [ ] **GOOG-02**: Class roster syncs automatically from Google Classroom
- [ ] **GOOG-03**: Teacher can push quiz as assignment to Google Classroom
- [ ] **GOOG-04**: Approved grades sync back to Google Classroom gradebook
- [ ] **GOOG-05**: Grade sync shows confirmation and handles failures gracefully

### Platform & Compliance

- [ ] **PLAT-01**: COPPA-compliant for under-13 students (school consent model)
- [ ] **PLAT-02**: FERPA-ready with audit logging for data access
- [ ] **PLAT-03**: Data Processing Agreement (DPA) template available for districts
- [ ] **PLAT-04**: User data deletion mechanism on request
- [ ] **PLAT-05**: WCAG 2.1 AA accessibility compliance

### Tier & Pricing

- [ ] **TIER-01**: Free tier uses local AI model (Ollama) for cost management
- [ ] **TIER-02**: Paid tier uses cloud AI (OpenAI) for complex extractions
- [ ] **TIER-03**: Free tier has monthly quiz generation limit
- [ ] **TIER-04**: Clear upgrade path from free to paid

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enhanced Delivery

- **DELV-10**: Live/synchronous quiz mode (teacher-controlled pacing)
- **DELV-11**: Per-student question SELECTION from pools (different students get different questions)
- **DELV-12**: Question pools with multiple variants of same concept

### Advanced AI

- **AI-01**: AI-powered difficulty adjustment based on student performance
- **AI-02**: AI grading for essay/short answer with teacher override

### Additional Integrations

- **INTG-01**: Canvas LMS integration
- **INTG-02**: Schoology integration
- **INTG-03**: Microsoft Teams for Education integration

### Analytics & Admin

- **ANLYT-01**: District-wide analytics dashboard
- **ANLYT-02**: Standards alignment tagging (Common Core, state standards)
- **ADMIN-01**: School/district admin portal

### Additional Question Types

- **QUES-10**: Video-embedded questions (Edpuzzle-style)
- **QUES-11**: Drawing/diagram questions

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| AI question generation (vs extraction) | Violates core value of 100% factual accuracy; hallucination risk |
| Public leaderboards | Research shows anxiety increase in struggling students |
| Heavy gamification (power-ups, memes) | Distracts from learning; accessibility issues |
| Native mobile apps (iOS/Android) | Web PWA sufficient; maintenance burden |
| Real-time chat/social features | COPPA/FERPA compliance complexity |
| Offline mode | Complex sync logic; most schools have connectivity |
| Coursera integration | Different market (MOOCs vs K-12 classrooms) |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

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

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0

---
*Requirements defined: 2025-01-23*
*Last updated: 2025-01-23 after roadmap creation*
