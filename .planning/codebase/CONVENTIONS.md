# Code Conventions

## TypeScript

### Strict Mode
- `strict: true` enabled
- No implicit any
- Strict null checks

### Type Annotations
```typescript
// Prefer explicit return types for public functions
function calculateScore(answers: Answer[]): number {
  return answers.filter(a => a.correct).length;
}

// Use interfaces for object shapes
interface Quiz {
  id: string;
  title: string;
  questions: Question[];
}

// Use type aliases for unions/primitives
type QuestionType = 'multiple-choice' | 'true-false' | 'short-answer';
```

### Null Handling
```typescript
// Prefer optional chaining
const title = quiz?.title ?? 'Untitled';

// Use nullish coalescing
const count = value ?? 0;
```

## React Patterns

### Component Structure
```typescript
// Functional components with TypeScript
interface Props {
  title: string;
  onSubmit: (data: FormData) => void;
}

export function QuizForm({ title, onSubmit }: Props) {
  // hooks first
  const [state, setState] = useState(initial);

  // handlers
  const handleSubmit = () => { /* ... */ };

  // render
  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

### Server vs Client Components
```typescript
// Server Component (default) - no directive needed
export default async function Page() {
  const data = await fetchData();
  return <div>{data}</div>;
}

// Client Component - explicit directive
'use client';

export function InteractiveWidget() {
  const [state, setState] = useState();
  return <button onClick={() => setState(/*...*/)}>Click</button>;
}
```

### Hooks Usage
- Custom hooks in `hooks/` directory
- Prefix with `use` (e.g., `useQuiz`, `useAuth`)
- Keep hooks focused and composable

## Styling

### Tailwind CSS
```typescript
// Use clsx + tailwind-merge for conditional classes
import { cn } from '@/lib/cn';

<button className={cn(
  'px-4 py-2 rounded',
  isActive && 'bg-blue-500',
  disabled && 'opacity-50'
)}>
```

### CSS Organization
- Global styles in `app/globals.css`
- Component-specific via Tailwind classes
- No CSS modules or styled-components

## API Routes

### Route Handler Pattern
```typescript
// app/api/quiz/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const data = await fetchData();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  // validate and process
  return NextResponse.json(result, { status: 201 });
}
```

### Error Response Format
```typescript
interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
}
```

## Database

### Prisma Patterns
```typescript
// Use transactions for related operations
await prisma.$transaction([
  prisma.quiz.create({ data: quizData }),
  prisma.question.createMany({ data: questions }),
]);

// Include relations explicitly
const quiz = await prisma.quiz.findUnique({
  where: { id },
  include: { questions: true, user: true },
});
```

### Naming
- Models: PascalCase singular (`User`, `Quiz`)
- Fields: camelCase (`createdAt`, `userId`)
- Relations: descriptive names (`questions`, `author`)

## Error Handling

### Service Layer
```typescript
// Throw typed errors
class QuizNotFoundError extends Error {
  constructor(id: string) {
    super(`Quiz not found: ${id}`);
    this.name = 'QuizNotFoundError';
  }
}

// Catch and transform at API boundary
try {
  return await quizService.get(id);
} catch (error) {
  if (error instanceof QuizNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  throw error;
}
```

### Client Error Boundaries
```typescript
'use client';

export function ErrorBoundary({ error, reset }) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

## Imports

### Order
1. React/Next.js imports
2. Third-party libraries
3. Internal aliases (@/*)
4. Relative imports
5. Types (if separate)

```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

import { formatDate } from './utils';

import type { Quiz } from '@/types';
```

## Comments

### When to Comment
- Complex business logic
- Non-obvious workarounds
- API documentation (JSDoc for public functions)

### JSDoc Example
```typescript
/**
 * Generates quiz questions from content using AI.
 * @param content - Source material for question generation
 * @param options - Generation options (count, difficulty)
 * @returns Array of generated questions
 * @throws {AIProviderError} If all AI providers fail
 */
async function generateQuestions(
  content: string,
  options: GenerateOptions
): Promise<Question[]> {
  // ...
}
```

## Git Conventions

### Commit Messages
- Conventional commits format
- `feat:` new features
- `fix:` bug fixes
- `docs:` documentation
- `refactor:` code changes
- `test:` test additions

### Branch Names
- `feature/quiz-export`
- `fix/auth-redirect`
- `refactor/ai-service`
