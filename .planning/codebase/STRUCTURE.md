# Directory Structure

## Root Layout

```
experiments/project/
├── app/                    # Next.js App Router
├── components/             # React components
├── lib/                    # Shared utilities
├── services/               # Business logic
├── prisma/                 # Database schema
├── public/                 # Static assets
├── __tests__/              # Test files
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── next.config.js          # Next.js config
├── tailwind.config.ts      # Tailwind config
├── jest.config.js          # Jest config
├── .env                    # Environment variables
└── Dockerfile              # Container config
```

## App Directory (Next.js App Router)

```
app/
├── layout.tsx              # Root layout
├── page.tsx                # Landing page
├── globals.css             # Global styles
├── api/                    # API routes
│   ├── auth/               # Authentication endpoints
│   ├── quiz/               # Quiz CRUD
│   └── generate/           # AI generation
├── dashboard/              # User dashboard
│   ├── page.tsx
│   └── layout.tsx
├── quiz/                   # Quiz interface
│   ├── [id]/               # Dynamic quiz routes
│   └── create/             # Quiz creation
└── auth/                   # Auth pages
    ├── login/
    ├── register/
    └── forgot-password/
```

## Components Directory

```
components/
├── ui/                     # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   └── Modal.tsx
├── quiz/                   # Quiz-specific components
│   ├── QuizCard.tsx
│   ├── QuestionDisplay.tsx
│   └── AnswerOption.tsx
├── forms/                  # Form components
│   ├── LoginForm.tsx
│   ├── QuizForm.tsx
│   └── SettingsForm.tsx
└── layout/                 # Layout components
    ├── Header.tsx
    ├── Footer.tsx
    └── Sidebar.tsx
```

## Lib Directory

```
lib/
├── utils.ts                # General utilities
├── cn.ts                   # Class name helper
├── auth.ts                 # Auth configuration
├── prisma.ts               # Prisma client
├── validators.ts           # Input validation
└── constants.ts            # App constants
```

## Services Directory

```
services/
├── ai/                     # AI provider services
│   ├── openai.ts
│   ├── groq.ts
│   └── index.ts            # Provider abstraction
├── content/                # Content extraction
│   ├── youtube.ts
│   ├── web.ts
│   └── parser.ts
├── quiz/                   # Quiz business logic
│   ├── generator.ts
│   ├── scorer.ts
│   └── exporter.ts
└── email/                  # Email service
    └── sender.ts
```

## Prisma Directory

```
prisma/
├── schema.prisma           # Database schema
├── migrations/             # Migration history
└── seed.ts                 # Database seeding
```

## Test Directory

```
__tests__/
├── unit/                   # Unit tests
│   ├── services/
│   └── lib/
├── integration/            # Integration tests
│   └── api/
└── setup.ts                # Test configuration
```

## Key File Locations

### Configuration
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript settings
- `next.config.js` - Next.js settings
- `tailwind.config.ts` - Tailwind settings
- `jest.config.js` - Test configuration
- `.env` / `.env.local` - Environment variables

### Entry Points
- `app/layout.tsx` - Root layout
- `app/page.tsx` - Home page
- `app/api/*/route.ts` - API handlers

### Database
- `prisma/schema.prisma` - Schema definition
- `lib/prisma.ts` - Client singleton

### Authentication
- `lib/auth.ts` - NextAuth config
- `app/api/auth/[...nextauth]/route.ts` - Auth handler

## Naming Conventions

### Files
- Components: PascalCase (`QuizCard.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Routes: kebab-case folders (`forgot-password/`)
- Tests: `*.test.ts` or `*.spec.ts`

### Directories
- Lowercase with hyphens for routes
- Lowercase for feature folders
- Singular for component categories (`component/`, not `components/`)

### Exports
- Named exports for utilities
- Default exports for pages/components
- Barrel exports (`index.ts`) for service modules

## Import Aliases

```typescript
// tsconfig.json paths
{
  "@/*": ["./*"],
  "@/components/*": ["components/*"],
  "@/lib/*": ["lib/*"],
  "@/services/*": ["services/*"]
}
```
