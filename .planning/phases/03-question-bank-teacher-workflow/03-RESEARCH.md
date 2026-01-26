# Phase 3: Question Bank & Teacher Workflow - Research

**Researched:** 2026-01-26
**Domain:** Quiz/Assessment Management, Question Bank Architecture, EdTech Teacher Workflows
**Confidence:** HIGH (verified with official docs and multiple sources)

## Summary

This research covers the data modeling, UI patterns, and architecture needed to implement a comprehensive question bank and teacher workflow system. The phase builds on existing CuratedQuestion infrastructure to add Quiz grouping, teacher preview/take flow, question editing, and support for additional question types (matching, fill-in-blank, true/false, essay).

The standard approach for quiz systems follows the pattern established by Moodle and Canvas LMS: separate tables for Quiz definitions, QuizQuestion junction (called "slots" in Moodle), and QuizAttempt tracking with per-question answer storage. For the UI, inline editing works for simple text changes while modals are preferred for complex multi-field edits. Matching questions use dnd-kit for drag-and-drop pairing, and fill-in-blank questions parse [BLANK] markers to render inline input fields.

**Primary recommendation:** Model Quiz/QuizQuestion/QuizAttempt as separate tables with a junction model for question ordering. Use @dnd-kit/sortable for matching questions. Store all question type data in the existing CuratedQuestion.options JSON field with typed structures per question type.

## Standard Stack

The established libraries/tools for this domain (all already in project):

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.4 | Server Actions for mutations | Native form handling, automatic POST |
| React | 19.2.3 | UI components | Native form actions support |
| Prisma | 7.3.0 | Database models | Already modeling CuratedQuestion |
| Zod | 3.25.76 | Server-side validation | Already in project |

### Supporting (To Add)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @dnd-kit/core | 6.x | Drag-and-drop foundation | Matching questions UI |
| @dnd-kit/sortable | 9.x | Sortable drag-and-drop | Matching pairs, question reordering |
| @dnd-kit/utilities | 3.x | CSS transform helpers | Style transforms during drag |

### Already Available (Reuse)
| Library | Version | Purpose | How to Reuse |
|---------|---------|---------|--------------|
| @aws-sdk/client-s3 | 3.975.0 | R2/S3 uploads | Already in blob.ts for PDFs - extend for images |
| @aws-sdk/s3-request-presigner | 3.975.0 | Presigned URLs | Already configured for R2 |
| tldraw | 4.3.0 | Canvas drawing | Already integrated for show-your-work |
| KaTeX | 0.16.27 | Math rendering | Already in MathText component |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/sortable | react-beautiful-dnd | dnd-kit is more actively maintained, hello-pangea/dnd is the fork |
| @dnd-kit/sortable | FormKit drag-and-drop | FormKit is newer/lighter but less documented |
| JSON options field | Separate MatchingPair table | JSON is simpler, already used for MC options |

**Installation:**
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Architecture Patterns

### Recommended Database Schema

```prisma
// Quiz groups selected questions for student assessment
model Quiz {
  id                String   @id @default(cuid())
  documentId        String   // Source document
  title             String
  description       String?
  status            String   @default("draft") // draft, preview_required, published, archived

  // Settings
  timeLimit         Int?     // Minutes, null = unlimited
  shuffleQuestions  Boolean  @default(false)
  showResults       String   @default("after_submit") // after_submit, after_due, manual

  // Teacher workflow
  teacherPreviewedAt DateTime? // CONT-06: Must preview before publish
  publishedAt       DateTime?

  createdById       String
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  document          Document @relation(fields: [documentId], references: [id])
  createdBy         User     @relation(fields: [createdById], references: [id])
  questions         QuizQuestion[]
  attempts          QuizAttempt[]

  @@index([documentId])
  @@index([createdById])
  @@index([status])
}

// Junction table for Quiz-Question relationship with ordering
model QuizQuestion {
  id                String   @id @default(cuid())
  quizId            String
  questionId        String   // References CuratedQuestion
  position          Int      // Order in quiz
  points            Float    @default(1.0)

  quiz              Quiz     @relation(fields: [quizId], references: [id], onDelete: Cascade)
  question          CuratedQuestion @relation(fields: [questionId], references: [id])

  @@unique([quizId, position])
  @@index([quizId])
  @@index([questionId])
}

// Student quiz attempt
model QuizAttempt {
  id                String   @id @default(cuid())
  quizId            String
  userId            String
  status            String   @default("in_progress") // in_progress, submitted, graded

  startedAt         DateTime @default(now())
  submittedAt       DateTime?
  gradedAt          DateTime?

  score             Float?
  maxScore          Float?

  quiz              Quiz     @relation(fields: [quizId], references: [id])
  user              User     @relation(fields: [userId], references: [id])
  answers           QuestionAnswer[]

  @@unique([quizId, userId]) // One active attempt per user per quiz
  @@index([quizId])
  @@index([userId])
  @@index([status])
}

// Individual question answer within an attempt
model QuestionAnswer {
  id                String   @id @default(cuid())
  attemptId         String
  questionId        String   // References CuratedQuestion

  // Answer data varies by question type
  answerData        Json     // Typed per question type

  // Grading
  isCorrect         Boolean?
  pointsEarned      Float?
  feedback          String?  // For essay/short answer

  // Canvas image for show-your-work
  workImageKey      String?  // R2 storage key
  workCanvasState   Json?    // tldraw snapshot

  answeredAt        DateTime @default(now())

  attempt           QuizAttempt @relation(fields: [attemptId], references: [id], onDelete: Cascade)
  question          CuratedQuestion @relation(fields: [questionId], references: [id])

  @@unique([attemptId, questionId])
  @@index([attemptId])
}
```

### Question Type Data Structures (for options/answerData JSON)

```typescript
// CuratedQuestion.options JSON structure per questionType
interface MultipleChoiceOptions {
  type: 'multiple_choice';
  choices: Array<{
    id: string;      // e.g., "A", "B", "C"
    text: string;    // Option text (may contain LaTeX)
    isCorrect: boolean;
  }>;
}

interface TrueFalseOptions {
  type: 'true_false';
  correctAnswer: boolean;
}

interface FillInBlankOptions {
  type: 'fill_in_blank';
  // Question text contains [BLANK] markers
  blanks: Array<{
    index: number;          // Position of blank (0-indexed)
    acceptedAnswers: string[]; // Multiple acceptable answers
    caseSensitive: boolean;
  }>;
}

interface MatchingOptions {
  type: 'matching';
  pairs: Array<{
    id: string;
    left: string;   // Term/prompt
    right: string;  // Definition/match
  }>;
}

interface EssayOptions {
  type: 'essay';
  minWords?: number;
  maxWords?: number;
  rubric?: string;  // Grading criteria for teacher/LLM
}

interface ShowWorkOptions {
  type: 'show_work';
  workingSteps: string[];  // Already implemented
}

// QuestionAnswer.answerData structure per questionType
interface MCAnswer { selectedChoiceId: string }
interface TFAnswer { answer: boolean }
interface FillBlankAnswer { blanks: string[] } // Array matching blank indices
interface MatchingAnswer { pairs: Array<{ leftId: string; rightId: string }> }
interface EssayAnswer { text: string; wordCount: number }
interface ShowWorkAnswer {
  finalAnswer: string;
  canvasState: object;  // tldraw snapshot
}
```

### Recommended Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── documents/[id]/
│   │   │   ├── quiz/
│   │   │   │   ├── page.tsx           # Quiz list for document
│   │   │   │   ├── new/page.tsx       # Create quiz from questions
│   │   │   │   └── [quizId]/
│   │   │   │       ├── page.tsx       # Quiz detail/edit
│   │   │   │       ├── preview/page.tsx # Teacher takes quiz (CONT-06)
│   │   │   │       └── edit/page.tsx  # Edit quiz questions
│   │   ├── question-bank/
│   │   │   ├── page.tsx               # Browse all questions
│   │   │   └── [questionId]/
│   │   │       └── edit/page.tsx      # Edit single question
│   │   └── quiz/[quizId]/
│   │       └── take/page.tsx          # Student takes quiz
├── components/
│   ├── quiz/
│   │   ├── quiz-builder.tsx           # Select questions for quiz
│   │   ├── quiz-preview.tsx           # Teacher preview mode
│   │   └── quiz-taker.tsx             # Student quiz UI
│   ├── questions/
│   │   ├── question-editor.tsx        # Edit any question type
│   │   ├── question-type-selector.tsx # Choose question type
│   │   ├── types/
│   │   │   ├── multiple-choice.tsx    # MC question component
│   │   │   ├── true-false.tsx         # T/F question component
│   │   │   ├── fill-in-blank.tsx      # Fill-in-blank renderer
│   │   │   ├── matching.tsx           # Matching with drag-drop
│   │   │   ├── essay.tsx              # Essay/short answer
│   │   │   └── image-question.tsx     # Image support wrapper
│   │   └── question-preview.tsx       # Read-only question display
│   └── question-bank/
│       ├── question-list.tsx          # Filterable question list
│       └── question-filters.tsx       # Filter by doc, type, bloom
├── lib/
│   ├── questions/
│   │   ├── types.ts                   # TypeScript types for question data
│   │   ├── grading.ts                 # Auto-grade logic per type
│   │   └── validation.ts              # Zod schemas per question type
│   └── storage/
│       └── images.ts                  # Image upload to R2 (extend blob.ts)
└── actions/
    ├── quiz.ts                        # Server actions for quiz CRUD
    ├── questions.ts                   # Server actions for question editing
    └── attempts.ts                    # Server actions for quiz attempts
```

### Pattern 1: Server Actions for Quiz Mutations

**What:** Use Next.js Server Actions for all quiz/question mutations instead of API routes
**When to use:** Creating quizzes, editing questions, submitting answers
**Example:**
```typescript
// src/actions/quiz.ts
'use server'

import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const CreateQuizSchema = z.object({
  documentId: z.string().cuid(),
  title: z.string().min(1).max(200),
  questionIds: z.array(z.string().cuid()).min(1),
});

export async function createQuiz(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'Unauthorized' };
  }

  const parsed = CreateQuizSchema.safeParse({
    documentId: formData.get('documentId'),
    title: formData.get('title'),
    questionIds: JSON.parse(formData.get('questionIds') as string),
  });

  if (!parsed.success) {
    return { error: 'Invalid input', details: parsed.error.flatten() };
  }

  const quiz = await prisma.quiz.create({
    data: {
      documentId: parsed.data.documentId,
      title: parsed.data.title,
      createdById: session.user.id,
      questions: {
        create: parsed.data.questionIds.map((qId, idx) => ({
          questionId: qId,
          position: idx,
        })),
      },
    },
  });

  revalidatePath(`/documents/${parsed.data.documentId}/quiz`);
  return { success: true, quizId: quiz.id };
}
```

### Pattern 2: Fill-in-Blank Rendering

**What:** Parse question text with [BLANK] markers and render inline inputs
**When to use:** Displaying fill-in-blank questions
**Example:**
```typescript
// src/components/questions/types/fill-in-blank.tsx
'use client';

import { useState } from 'react';
import { MathText } from '@/components/quiz/math-display';

interface FillInBlankProps {
  questionText: string; // Contains [BLANK] markers
  blanks: Array<{ index: number; acceptedAnswers: string[] }>;
  onAnswer: (answers: string[]) => void;
  readOnly?: boolean;
  initialAnswers?: string[];
}

export function FillInBlank({
  questionText,
  blanks,
  onAnswer,
  readOnly,
  initialAnswers = []
}: FillInBlankProps) {
  const [answers, setAnswers] = useState<string[]>(
    initialAnswers.length ? initialAnswers : blanks.map(() => '')
  );

  const handleChange = (index: number, value: string) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
    onAnswer(newAnswers);
  };

  // Split text by [BLANK] markers
  const parts = questionText.split(/\[BLANK\]/g);

  return (
    <div className="fill-in-blank">
      {parts.map((part, i) => (
        <span key={i}>
          <MathText>{part}</MathText>
          {i < parts.length - 1 && (
            <input
              type="text"
              value={answers[i] || ''}
              onChange={(e) => handleChange(i, e.target.value)}
              disabled={readOnly}
              className="mx-1 w-32 border-b-2 border-gray-400 bg-transparent
                         text-center focus:border-blue-500 focus:outline-none
                         disabled:bg-gray-100"
              placeholder={`blank ${i + 1}`}
            />
          )}
        </span>
      ))}
    </div>
  );
}
```

### Pattern 3: Matching Question with dnd-kit

**What:** Drag-and-drop matching using @dnd-kit/sortable
**When to use:** QUES-04 Matching questions
**Example:**
```typescript
// src/components/questions/types/matching.tsx
'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface MatchingProps {
  pairs: MatchingPair[];
  onAnswer: (matches: Array<{ leftId: string; rightId: string }>) => void;
  readOnly?: boolean;
}

function SortableRight({ id, text }: { id: string; text: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded border bg-white p-2 shadow-sm active:cursor-grabbing"
    >
      {text}
    </div>
  );
}

export function Matching({ pairs, onAnswer, readOnly }: MatchingProps) {
  // Shuffle right side initially for quiz-taking
  const [rightOrder, setRightOrder] = useState<string[]>(() =>
    pairs.map((p) => p.id).sort(() => Math.random() - 0.5)
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setRightOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);

        // Report current matches based on position alignment
        const matches = pairs.map((p, idx) => ({
          leftId: p.id,
          rightId: newOrder[idx],
        }));
        onAnswer(matches);

        return newOrder;
      });
    }
  };

  return (
    <div className="matching-question grid grid-cols-2 gap-4">
      {/* Left column - fixed */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600">Terms</div>
        {pairs.map((pair) => (
          <div key={pair.id} className="rounded border bg-gray-50 p-2">
            {pair.left}
          </div>
        ))}
      </div>

      {/* Right column - draggable */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-600">Definitions</div>
        {readOnly ? (
          rightOrder.map((id) => {
            const pair = pairs.find((p) => p.id === id);
            return (
              <div key={id} className="rounded border bg-gray-50 p-2">
                {pair?.right}
              </div>
            );
          })
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={rightOrder} strategy={verticalListSortingStrategy}>
              {rightOrder.map((id) => {
                const pair = pairs.find((p) => p.id === id);
                return <SortableRight key={id} id={id} text={pair?.right || ''} />;
              })}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
```

### Pattern 4: Question Editing Modal

**What:** Modal for editing question with all fields
**When to use:** CONT-07 Teacher editing questions
**Example:**
```typescript
// src/components/questions/question-editor.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface QuestionEditorProps {
  question: CuratedQuestion;
  onSave: (data: FormData) => Promise<{ error?: string }>;
  onCancel: () => void;
}

export function QuestionEditor({ question, onSave, onCancel }: QuestionEditorProps) {
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setSaving(true);
    const result = await onSave(formData);
    setSaving(false);

    if (!result.error) {
      onCancel(); // Close modal
      router.refresh(); // Revalidate page data
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
        <h2 className="mb-4 text-xl font-bold">Edit Question</h2>

        <form action={handleSubmit}>
          <input type="hidden" name="questionId" value={question.id} />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Question Text</label>
              <textarea
                name="questionText"
                defaultValue={question.questionText}
                rows={3}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            {/* Type-specific fields rendered based on question.questionType */}
            <QuestionTypeFields
              questionType={question.questionType}
              options={question.options}
            />

            <div>
              <label className="block text-sm font-medium">Explanation</label>
              <textarea
                name="explanation"
                defaultValue={question.explanation}
                rows={2}
                className="mt-1 w-full rounded border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Source Evidence</label>
              <textarea
                name="sourceEvidence"
                defaultValue={question.sourceEvidence}
                rows={2}
                className="mt-1 w-full rounded border p-2"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded border px-4 py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:bg-blue-300"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### Anti-Patterns to Avoid

- **Storing answers in question model:** Keep QuestionAnswer separate from CuratedQuestion. Questions are reusable; answers are per-attempt.
- **Mixing quiz status in single field:** Use explicit timestamp fields (teacherPreviewedAt, publishedAt) rather than complex status strings.
- **Client-side quiz validation only:** Always validate answers server-side in Server Actions.
- **Polling for quiz state:** Use optimistic updates with useActionState, not polling.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop matching | Custom mouse event handlers | @dnd-kit/sortable | Keyboard/touch/accessibility, animation |
| Image uploads | Direct file handling | R2 presigned URLs | Already configured in blob.ts |
| Form validation | Manual checks | Zod schemas | Type inference, composable |
| Math rendering | Custom LaTeX parser | KaTeX (already integrated) | Edge cases, security |
| Canvas drawing | HTML5 canvas | tldraw (already integrated) | Full drawing tools, export |

**Key insight:** The project already has image upload (R2), drawing (tldraw), and math (KaTeX) infrastructure. Phase 3 extends these, not replaces them.

## Common Pitfalls

### Pitfall 1: Quiz Status Race Conditions
**What goes wrong:** Teacher publishes quiz while student is mid-preview, or multiple status updates conflict.
**Why it happens:** Status modeled as single string field.
**How to avoid:** Use timestamp fields for each state transition. A quiz is "published" if publishedAt is set, "previewed" if teacherPreviewedAt is set.
**Warning signs:** "status" field with complex string enum.

### Pitfall 2: Question Bank Performance
**What goes wrong:** Slow question bank queries as question count grows.
**Why it happens:** Missing indexes on filter fields, loading all questions at once.
**How to avoid:** Index documentId, questionType, bloomLevel, teacherSelected. Use pagination. Consider full-text search for question text.
**Warning signs:** Prisma queries without take/skip, missing @@index annotations.

### Pitfall 3: Fill-in-Blank Answer Matching
**What goes wrong:** "42" marked wrong when "42.0" is correct, or "The Answer" vs "the answer".
**Why it happens:** Exact string comparison.
**How to avoid:** Store caseSensitive flag and acceptedAnswers array. Trim whitespace. For numeric blanks, parse and compare as numbers.
**Warning signs:** Single correctAnswer string for fill-in-blank.

### Pitfall 4: Matching Question Shuffling
**What goes wrong:** Answer key visible because right-side order matches left-side.
**Why it happens:** Pairs rendered in definition order.
**How to avoid:** Shuffle right-side on component mount. Store shuffled order in component state, not prop.
**Warning signs:** Matching pairs rendered with same array index.

### Pitfall 5: Teacher Preview Not Enforced
**What goes wrong:** Quiz published without teacher taking it (CONT-06 violated).
**Why it happens:** Publish button not checking preview status.
**How to avoid:** Check teacherPreviewedAt before allowing publish. Show clear UI state: "Preview Required" vs "Ready to Publish".
**Warning signs:** Direct status update without conditional checks.

### Pitfall 6: Image Upload Without Size/Type Validation
**What goes wrong:** Oversized images slow page load, wrong file types uploaded.
**Why it happens:** Client-side upload without validation.
**How to avoid:** Validate file size (<5MB) and type (image/*) before presigned URL. Use existing blob.ts patterns.
**Warning signs:** Direct file upload without checks.

## Code Examples

### Image Upload for Questions (extend existing blob.ts)

```typescript
// src/lib/storage/images.ts
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2Bucket } from './r2-client';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const UPLOAD_URL_EXPIRY = 60 * 5; // 5 minutes

export interface ImageUploadResult {
  uploadUrl: string;
  storageKey: string;
  publicUrl: string;
}

/**
 * Generate presigned URL for client-side image upload
 */
export async function getImageUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<ImageUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.includes(contentType)) {
    throw new Error(`Invalid image type: ${contentType}`);
  }
  if (fileSize > MAX_IMAGE_SIZE) {
    throw new Error(`Image too large: ${fileSize} bytes. Maximum is ${MAX_IMAGE_SIZE} bytes.`);
  }

  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const storageKey = `questions/${userId}/${timestamp}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: getR2Bucket(),
    Key: storageKey,
    ContentType: contentType,
    ContentLength: fileSize,
  });

  const uploadUrl = await getSignedUrl(getR2Client(), command, {
    expiresIn: UPLOAD_URL_EXPIRY,
  });

  return {
    uploadUrl,
    storageKey,
    publicUrl: `${process.env.R2_PUBLIC_URL}/${storageKey}`,
  };
}
```

### Auto-Grading Logic

```typescript
// src/lib/questions/grading.ts
import type { QuestionAnswer, CuratedQuestion } from '@/generated/prisma/client';

export function gradeAnswer(
  question: CuratedQuestion,
  answerData: unknown
): { isCorrect: boolean; pointsEarned: number } {
  const options = question.options as Record<string, unknown>;

  switch (question.questionType) {
    case 'multiple_choice': {
      const answer = answerData as { selectedChoiceId: string };
      const choices = (options as MultipleChoiceOptions).choices;
      const correct = choices.find(c => c.isCorrect);
      const isCorrect = answer.selectedChoiceId === correct?.id;
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0 };
    }

    case 'true_false': {
      const answer = answerData as { answer: boolean };
      const correct = (options as TrueFalseOptions).correctAnswer;
      const isCorrect = answer.answer === correct;
      return { isCorrect, pointsEarned: isCorrect ? 1 : 0 };
    }

    case 'fill_in_blank': {
      const answer = answerData as { blanks: string[] };
      const blankConfig = (options as FillInBlankOptions).blanks;
      let correctCount = 0;

      blankConfig.forEach((blank, idx) => {
        const studentAnswer = (answer.blanks[idx] || '').trim();
        const isMatch = blank.acceptedAnswers.some(accepted => {
          if (blank.caseSensitive) {
            return studentAnswer === accepted;
          }
          return studentAnswer.toLowerCase() === accepted.toLowerCase();
        });
        if (isMatch) correctCount++;
      });

      const isCorrect = correctCount === blankConfig.length;
      return {
        isCorrect,
        pointsEarned: correctCount / blankConfig.length
      };
    }

    case 'matching': {
      const answer = answerData as { pairs: Array<{ leftId: string; rightId: string }> };
      const correctPairs = (options as MatchingOptions).pairs;
      let correctCount = 0;

      answer.pairs.forEach(match => {
        const correct = correctPairs.find(p => p.id === match.leftId);
        if (correct && correct.id === match.rightId) {
          correctCount++;
        }
      });

      const isCorrect = correctCount === correctPairs.length;
      return {
        isCorrect,
        pointsEarned: correctCount / correctPairs.length
      };
    }

    case 'essay':
    case 'short_answer':
      // Requires manual or LLM grading
      return { isCorrect: false, pointsEarned: 0 };

    case 'show_work':
      // Requires manual grading
      return { isCorrect: false, pointsEarned: 0 };

    default:
      return { isCorrect: false, pointsEarned: 0 };
  }
}
```

### Teacher Preview Flow

```typescript
// src/app/(dashboard)/documents/[id]/quiz/[quizId]/preview/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { QuizTaker } from '@/components/quiz/quiz-taker';
import { markQuizPreviewed } from '@/actions/quiz';

export default async function TeacherPreviewPage({
  params
}: {
  params: Promise<{ id: string; quizId: string }>
}) {
  const { id: documentId, quizId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: {
        include: { question: true },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!quiz || quiz.createdById !== session.user.id) {
    redirect(`/documents/${documentId}`);
  }

  // Handler for when teacher completes preview
  async function handlePreviewComplete(data: FormData) {
    'use server';
    await markQuizPreviewed(quizId);
    redirect(`/documents/${documentId}/quiz/${quizId}`);
  }

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h2 className="font-bold text-blue-900">Teacher Preview Mode</h2>
        <p className="text-sm text-blue-700">
          Experience the quiz exactly as students will see it.
          Complete the preview to enable publishing.
        </p>
      </div>

      <QuizTaker
        quiz={quiz}
        questions={quiz.questions.map(q => q.question)}
        isPreview={true}
        onComplete={handlePreviewComplete}
      />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API routes for mutations | Server Actions | Next.js 14+ (stable 15+) | Simpler forms, type safety |
| react-beautiful-dnd | @dnd-kit | 2022 (react-beautiful-dnd unmaintained) | Active maintenance, better a11y |
| Complex status strings | Timestamp fields | Industry best practice | Clearer state, no race conditions |
| Custom drag handlers | dnd-kit sensors | 2024+ | Touch, keyboard, accessibility |

**Deprecated/outdated:**
- react-beautiful-dnd: Unmaintained, use @dnd-kit or hello-pangea/dnd (fork)
- API routes for simple mutations: Server Actions preferred in App Router
- useFormState: Renamed to useActionState in React 19

## Open Questions

Things that couldn't be fully resolved:

1. **Essay/Short Answer Grading Strategy**
   - What we know: LLMs can achieve ~0.68 QWK agreement with human graders. GPT-4 tends to grade lower than humans.
   - What's unclear: Whether to use LLM-assisted grading or manual-only for this project.
   - Recommendation: Start with manual grading, add LLM suggestions as "draft grades" for teacher review in future phase.

2. **Question Bank Search/Filtering Scale**
   - What we know: PostgreSQL full-text search works for moderate scale.
   - What's unclear: At what question count (1K? 10K?) dedicated search is needed.
   - Recommendation: Start with Prisma filters + indexes. Add pg_trgm extension if search becomes slow.

3. **Quiz Timer Implementation**
   - What we know: Client-side timers can be manipulated. Moodle uses server-side timestamp comparison.
   - What's unclear: How strict timing needs to be for this educational context.
   - Recommendation: Store startedAt timestamp. Calculate remaining time server-side on each answer submission. Grace period for network issues.

## Sources

### Primary (HIGH confidence)
- [Next.js Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations) - Form handling, mutations, security
- [@dnd-kit/sortable Documentation](https://docs.dndkit.com/presets/sortable) - Drag-and-drop implementation
- [Prisma Relations](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations) - Schema design patterns
- [Cloudflare R2 Presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/) - Image upload

### Secondary (MEDIUM confidence)
- [Moodle Quiz Database Structure](https://docs.moodle.org/dev/Quiz_database_structure) - Quiz/attempt data model patterns
- [Canvas LMS Quiz API](https://canvas.instructure.com/doc/api/quiz_submissions.html) - Quiz attempt states
- [Top 5 Drag-and-Drop Libraries 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) - Library comparison

### Tertiary (LOW confidence)
- [PatternFly Inline Edit](https://www.patternfly.org/components/inline-edit/design-guidelines/) - Edit UX patterns
- [LLM Essay Grading Research](https://dl.acm.org/doi/10.1145/3706468.3706481) - AI grading capabilities

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs, most already in project
- Architecture: HIGH - Schema patterns from Moodle/Canvas, verified Prisma patterns
- Pitfalls: MEDIUM - Based on industry patterns, some specific to this stack

**Research date:** 2026-01-26
**Valid until:** 2026-02-26 (30 days - stable patterns)
