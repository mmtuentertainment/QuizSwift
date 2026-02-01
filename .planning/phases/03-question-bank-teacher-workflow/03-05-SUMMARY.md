---
phase: 03-question-bank-teacher-workflow
plan: 05
completed: 2026-01-26
subsystem: quiz-workflow
tags: [grading, quiz-taking, preview, server-actions]

dependencies:
  requires: [03-01, 03-02, 03-03]
  provides: [auto-grading, quiz-attempts, teacher-preview]
  affects: [03-06, 04-xx]

tech-stack:
  patterns: [Server Actions, answer-format-conversion, partial-credit-grading]

files:
  created:
    - src/lib/questions/grading.ts
    - src/actions/attempts.ts
    - src/components/quiz/quiz-taker.tsx
    - src/app/(dashboard)/documents/[id]/quiz/[quizId]/preview/page.tsx
    - src/app/(dashboard)/documents/[id]/quiz/[quizId]/preview/actions.tsx
  modified:
    - src/components/quiz/index.ts

decisions:
  - id: answer-format-conversion
    choice: "Separate format conversion between renderer and library types"
    rationale: "QuestionRenderer uses discriminated union with type field, grading uses flatter structure"
  - id: partial-credit-calculation
    choice: "(correctCount / totalCount) * maxPoints"
    rationale: "Simple proportional partial credit for fill-in-blank and matching"
  - id: preview-via-attempt
    choice: "Teacher preview creates real QuizAttempt"
    rationale: "Reuses quiz-taking flow, provides realistic experience"

metrics:
  duration: "12 min"
  tasks_completed: 3
  lines_added: ~895
---

# Phase 3 Plan 05: Quiz Taking & Teacher Preview Summary

## Summary

Quiz-taking flow with auto-grading for objective types and teacher preview mode for CONT-06 workflow.

## What Was Built

### 1. Auto-Grading Logic (`src/lib/questions/grading.ts`)

Core grading module supporting automatic grading for objective question types:

| Question Type | Grading Method | Partial Credit |
|--------------|----------------|----------------|
| multiple_choice | Exact match to correct choice | No |
| true_false | Boolean comparison | No |
| fill_in_blank | Per-blank matching with case sensitivity option | Yes |
| matching | Per-pair leftId === rightId comparison | Yes |
| essay/short_answer/show_work | Returns "requires manual grading" | N/A |

Key exports:
- `gradeAnswer(questionType, options, answerData, maxPoints)` - Main grading function
- `isAutoGradable(questionType)` - Check if type supports auto-grading
- `calculateTotalScore(gradeResults)` - Aggregate multiple results

### 2. Server Actions (`src/actions/attempts.ts`)

Quiz attempt management via Server Actions:

| Action | Purpose |
|--------|---------|
| `startAttempt` | Create or retrieve existing attempt for user |
| `submitAnswer` | Save answer with auto-grading |
| `completeAttempt` | Calculate final score, mark as submitted |
| `markQuizPreviewed` | Set teacherPreviewedAt for CONT-06 |
| `getAttemptWithAnswers` | Resume support for in-progress attempts |

### 3. QuizTaker Component (`src/components/quiz/quiz-taker.tsx`)

Full-featured quiz-taking UI component (433 lines):

**Features:**
- Sequential question navigation (prev/next)
- Progress bar showing current position
- Clickable question dots for direct navigation
- Visual indicators: current (blue), answered (green), unanswered (gray)
- Auto-save answers to server on change
- Resume from existing in-progress attempts
- Score display on completion
- Support for all question types via QuestionRenderer

**Props:**
```typescript
interface QuizTakerProps {
  quizId: string;
  questions: CuratedQuestion[];
  isPreview?: boolean;
  onComplete?: (score: number, maxScore: number) => void;
  timeLimit?: number | null;
}
```

### 4. Teacher Preview Page

Route: `/documents/[id]/quiz/[quizId]/preview`

**Components:**
- Server page (`page.tsx`) - Fetches quiz data, verifies ownership
- Client wrapper (`actions.tsx`) - Handles completion callback

**Flow:**
1. Teacher navigates to preview
2. Preview creates QuizAttempt (same as student experience)
3. Teacher answers questions
4. On submit, calls `markQuizPreviewed`
5. Quiz now eligible for publishing (CONT-06 satisfied)

## Answer Format Conversion

The QuizTaker bridges two answer format systems:

**Renderer Format** (QuestionRenderer):
```typescript
{ type: 'multiple_choice', selectedId: string | null }
{ type: 'true_false', selectedAnswer: boolean | null }
{ type: 'fill_in_blank', answers: string[] }
{ type: 'matching', pairs: Array<{ leftId, rightId }> }
```

**Library Format** (grading/storage):
```typescript
{ selectedChoiceId: string }
{ answer: boolean }
{ blanks: string[] }
{ pairs: Array<{ leftId, rightId }> }
```

Conversion functions: `toLibAnswerData()` and `toRendererAnswerData()`

## Commits

| Hash | Message |
|------|---------|
| d121502 | feat(03-05): add auto-grading logic for quiz questions |
| b891d42 | feat(03-05): add Server Actions for quiz attempt management |
| 9d1bae6 | feat(03-05): add QuizTaker component and teacher preview page |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] `npx tsc --noEmit` passes
- [x] gradeAnswer returns correct results for MC, T/F, fill-blank, matching
- [x] QuizTaker shows questions with navigation
- [x] Answers saved to database via Server Actions
- [x] Preview completion shows score
- [x] Quiz marked as previewed (teacherPreviewedAt set)

## Key Links Verified

- [x] `src/actions/attempts.ts` imports `gradeAnswer` from `src/lib/questions/grading.ts`
- [x] `src/components/quiz/quiz-taker.tsx` imports `QuestionRenderer` from `@/components/questions`

## Next Phase Readiness

Plan 03-05 provides:
- Auto-grading logic ready for student quiz delivery (Phase 4)
- Quiz attempt infrastructure for multiple students
- Teacher preview completing CONT-06 workflow requirement

Dependencies unlocked:
- Quiz can now be published after teacher preview
- Student quiz-taking mode can reuse QuizTaker component
