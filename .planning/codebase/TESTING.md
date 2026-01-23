# Testing Strategy

## Framework

**Jest** ^30.2.0 with TypeScript support via **ts-jest** ^29.4.6

## Test Environment

- `jest-environment-jsdom` for React component tests
- Node environment for service/API tests

## Test Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| @testing-library/react | ^16.3.2 | React component testing |
| @testing-library/jest-dom | ^6.9.1 | DOM assertion matchers |
| @testing-library/user-event | ^14.6.1 | User interaction simulation |

## Directory Structure

```
__tests__/
├── unit/
│   ├── services/
│   │   ├── ai.test.ts
│   │   ├── quiz.test.ts
│   │   └── content.test.ts
│   ├── lib/
│   │   ├── utils.test.ts
│   │   └── validators.test.ts
│   └── components/
│       ├── Button.test.tsx
│       └── QuizCard.test.tsx
├── integration/
│   └── api/
│       ├── quiz.test.ts
│       └── auth.test.ts
└── setup.ts
```

## Test File Naming

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts` (if added)

## Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## Test Patterns

### Unit Test Example

```typescript
// services/quiz.test.ts
import { calculateScore } from '@/services/quiz/scorer';

describe('calculateScore', () => {
  it('returns correct count for all correct answers', () => {
    const answers = [
      { questionId: '1', selected: 'a', correct: true },
      { questionId: '2', selected: 'b', correct: true },
    ];

    expect(calculateScore(answers)).toBe(2);
  });

  it('returns 0 for no correct answers', () => {
    const answers = [
      { questionId: '1', selected: 'a', correct: false },
    ];

    expect(calculateScore(answers)).toBe(0);
  });
});
```

### Component Test Example

```typescript
// components/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('calls onClick when clicked', async () => {
    const onClick = jest.fn();
    render(<Button onClick={onClick}>Click</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### API Route Test Example

```typescript
// api/quiz.test.ts
import { GET, POST } from '@/app/api/quiz/route';
import { NextRequest } from 'next/server';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  quiz: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
}));

describe('Quiz API', () => {
  describe('GET /api/quiz', () => {
    it('returns quizzes for authenticated user', async () => {
      const mockQuizzes = [{ id: '1', title: 'Test Quiz' }];
      prisma.quiz.findMany.mockResolvedValue(mockQuizzes);

      const request = new NextRequest('http://localhost/api/quiz');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockQuizzes);
    });
  });
});
```

## Mocking

### Prisma Mocking

```typescript
// __tests__/setup.ts or individual test files
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    quiz: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));
```

### External API Mocking

```typescript
// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'mocked response' } }],
        }),
      },
    },
  })),
}));
```

### Next.js Mocking

```typescript
// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
}));
```

## Coverage

### Configuration

```javascript
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.ts',
    'services/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### Current Coverage Gaps

- AI service integration tests
- Content extraction edge cases
- Export functionality (PDF/ZIP)
- Error boundary components
- Authentication flows

## Testing Best Practices

### Do
- Test behavior, not implementation
- Use meaningful test descriptions
- Keep tests focused and small
- Mock external dependencies
- Test error cases

### Don't
- Test implementation details
- Create brittle tests
- Skip error case testing
- Over-mock (test real integration when possible)
- Leave flaky tests

## CI Integration

Tests run on:
- Pre-commit (via hooks)
- Pull request checks
- Main branch pushes

```yaml
# Example GitHub Actions
- name: Run tests
  run: npm test -- --coverage
```
