# QuizSwift: AI-Powered Quiz Generator

## Overview

QuizSwift is a web-based micro-SaaS that leverages AI to automate quiz creation for educators, transforming text, URLs, or YouTube transcripts into customizable assessments.

## Job to Be Done

Empower educators to create personalized quizzes effortlessly, enhancing student engagement without technical hurdles.

---

## Target Users

### User Personas
- **Sarah** - Middle School Teacher (general subjects)
- **Dr. Aris** - University Physics Professor
- **Mike** - Vocational Shop Class Instructor
- **Lena** - Corporate Compliance Trainer

### Audience Scope
- K-12 Education
- Higher Ed (Associates to PhD)
- Vocational/Trade (Shop, culinary)
- Corporate Training

---

## Functional Requirements

### FR1: Input Sources
The system must accept content from:
1. **Plain Text** - Copy/paste text content
2. **URLs** - Web pages (articles, documentation)
3. **YouTube** - Video transcripts via URL

### FR2: AI Quiz Generation
1. Generate questions from input content using OpenAI/Groq APIs
2. Support multiple question types:
   - Multiple choice
   - True/False
   - Short answer
   - Fill in the blank
3. Adapt complexity levels:
   - Kindergarten through PhD level
   - User-selectable difficulty

### FR3: Subject Support
Universal coverage including:
- Math, Science (AP Chem/Bio)
- Social Studies, Civics, Government
- English/Language Arts
- Vocational subjects

### FR4: Quiz Customization
1. Edit generated questions
2. Add/remove questions
3. Reorder questions
4. Adjust difficulty per question
5. Set time limits (optional)

### FR5: Export Functionality
1. Export to PDF
2. Export to common formats (CSV, JSON)
3. Print-friendly view

### FR6: User Authentication
1. Sign up / Sign in
2. Save quizzes to account
3. Quiz history

---

## Non-Functional Requirements

### NFR1: Performance
- Quiz generation in <10 seconds
- 80% faster than manual quiz creation

### NFR2: Accessibility
- WCAG compliant
- Mobile-responsive design

### NFR3: Privacy
- No student data stored
- FERPA compliance considerations

### NFR4: Cost
- Infrastructure costs <$50/month at scale

---

## Technical Architecture

### Frontend
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- React components

### Backend
- Next.js API routes
- OpenAI API for quiz generation
- Groq API as alternative/backup

### Data Storage
- User accounts
- Saved quizzes
- (Database TBD - consider Prisma + PostgreSQL or similar)

---

## Acceptance Criteria

### MVP Criteria
- [ ] User can sign up and log in
- [ ] User can input text directly
- [ ] User can input a URL for content extraction
- [ ] User can input a YouTube URL for transcript extraction
- [ ] AI generates quiz questions from content
- [ ] User can select difficulty level (Elementary/Middle/High/College/Graduate)
- [ ] User can edit generated questions
- [ ] User can export quiz to PDF
- [ ] Quiz generates in under 10 seconds

### Phase 1 Criteria (Post-MVP)
- [ ] Multiple export formats
- [ ] Quiz sharing/collaboration
- [ ] Advanced question types

---

## User Flow

```
1. User signs up / logs in
2. User enters content (text, URL, or YouTube link)
3. User selects difficulty level
4. User clicks "Generate Quiz"
5. AI processes content and generates questions
6. User reviews and edits questions
7. User exports or saves quiz
```

---

## Non-Goals (Out of Scope)

- Full LMS platform features
- Student-facing quiz-taking app
- Native video file upload (YouTube URL only for MVP)
- Real-time collaboration (Phase 2+)
