# QuizSwift

## What This Is

A quiz generation platform for K-12 teachers that extracts factually accurate assessments directly from textbook content. Teachers upload chapters, the system extracts quiz-worthy material (definitions, equations, concepts), and students take randomized versions that prevent answer-sharing. Integrated with Google Classroom for seamless classroom workflow.

## Core Value

100% factual accuracy — every question and answer is extracted directly from source material, never generated or assumed. If it's not in the text, it's not in the quiz.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Teacher can upload textbook content (text, images, video)
- [ ] System extracts quiz questions from uploaded content only
- [ ] Questions limited to what is explicitly stated in source material
- [ ] Teacher must take the quiz before approving it
- [ ] Teacher can edit extracted questions before publishing
- [ ] Multiple choice questions supported
- [ ] Fill-in-the-blank questions supported
- [ ] Matching questions supported
- [ ] Short answer questions supported
- [ ] Math problems with show-your-work supported
- [ ] Each student receives same quiz with randomized question order
- [ ] System auto-scores completed quizzes
- [ ] Grades remain pending until teacher reviews and approves
- [ ] Teacher sees full quiz with student answers and analytics
- [ ] Analytics show which questions students struggled with
- [ ] Google Classroom integration for class rosters
- [ ] Google Classroom integration for grade sync
- [ ] Classroom profiles store grade level and subject context
- [ ] Freemium model — simpler quizzes get more free usage
- [ ] Local/open-source model handles free tier requests (Ollama/HuggingFace)
- [ ] Paid tier uses more capable models for complex content

### Out of Scope

- Canvas integration — v2 (after Google Classroom proven)
- Coursera integration — different market, revisit later
- Mobile app — web-first
- Real-time collaborative quiz taking
- AI-generated questions beyond source material — violates core value

## Context

**Target market:** K-12 teachers using Google Classroom in US public/private schools

**Business model:** SaaS with freemium tier
- Free tier: simpler quizzes, local model, limited monthly usage
- Paid tier: complex content, better models, unlimited usage, priority support

**Why this matters to teachers:**
- Quiz creation is time-consuming — extraction saves hours
- Cheating via answer-sharing is rampant — randomization solves it
- Manual grading is tedious — auto-scoring with review approval balances speed and accuracy
- Existing tools don't ensure factual accuracy — teachers can't trust AI-generated content

**Technical approach:**
- Extraction-based, not generation-based — reliability over creativity
- Fine-tuned small model for education domain (free tier)
- API-based capable models for complex content (paid tier)
- Teacher-in-the-loop at two checkpoints: quiz approval and grade approval

## Constraints

- **Accuracy**: Zero tolerance for hallucinated or assumed content — extraction only
- **Integration**: Must work within Google Classroom ecosystem (OAuth, Classroom API, grade sync)
- **Cost**: Free tier must be sustainable — local model inference, not API calls
- **Workflow**: Teachers approve twice — once for quiz content, once for final grades

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Google Classroom first | Largest K-12 market, individual teacher adoption | — Pending |
| K-12 scope for v1 | Broader market than single grade, complexity tiers naturally | — Pending |
| Extraction-only approach | Core differentiator is accuracy, not creativity | — Pending |
| Teacher-takes-quiz approval | Quality control catches bad questions before students | — Pending |
| Local model for free tier | Sustainable unit economics on freemium | — Pending |
| Randomized question order | Prevents student answer-sharing, key pain point | — Pending |

---
*Last updated: 2025-01-23 after initialization*
