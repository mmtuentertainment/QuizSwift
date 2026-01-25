# AGENTS.md - Operational Guide (KEEP UNDER 60 LINES)

## Build & Run
```bash
npm install
npm run dev        # Next.js dev server at localhost:3000
npm run build      # Production build
npm start          # Start production server
```

## Validation
- Tests: `npm test` (Jest)
- Typecheck: `npm run typecheck` (tsc --noEmit)
- Lint: `npm run lint` (ESLint)

## Tech Stack
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- OpenAI/Groq APIs for quiz generation

## Project Structure
```
src/
  app/           # Next.js App Router pages & API routes
    api/         # API endpoints
  components/    # React components
  lib/           # Utilities, API clients, helpers
  types/         # TypeScript types
```

## Patterns
- TypeScript for all files
- API routes in `src/app/api/`
- Components in `src/components/`
- Utilities in `src/lib/`
- Tests alongside source as `*.test.ts`
- Environment variables in `.env.local`
