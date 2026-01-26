# Technology Stack

## Languages & Runtime

| Technology | Version | Purpose |
|------------|---------|---------|
| TypeScript | ^5 | Primary language with strict mode |
| Node.js | 20.x | Runtime (Alpine-based Docker) |
| JavaScript | ES2022+ | Build tooling |

## Core Framework

| Package | Version | Role |
|---------|---------|------|
| Next.js | 16.1.3 | Full-stack React framework with App Router |
| React | 19.2.3 | UI library |
| React DOM | 19.2.3 | DOM rendering |

## Database & ORM

| Package | Version | Role |
|---------|---------|------|
| Prisma | ^7.2.0 | ORM and schema management |
| @prisma/client | ^7.2.0 | Database client |
| @prisma/adapter-pg | ^7.2.0 | PostgreSQL adapter |
| pg | ^8.17.1 | PostgreSQL driver |

## Authentication

| Package | Version | Role |
|---------|---------|------|
| next-auth | ^5.0.0-beta.30 | Auth framework (OAuth + credentials) |
| bcryptjs | ^3.0.3 | Password hashing |

## AI Integration

| Package | Version | Role |
|---------|---------|------|
| openai | ^6.16.0 | OpenAI API client |
| groq-sdk | ^0.37.0 | Groq API client (fallback provider) |

## Content Processing

| Package | Version | Role |
|---------|---------|------|
| cheerio | ^1.1.2 | HTML parsing/web scraping |
| youtube-transcript | ^1.2.1 | YouTube transcript extraction |

## Export & Documents

| Package | Version | Role |
|---------|---------|------|
| @react-pdf/renderer | ^4.3.2 | PDF generation |
| jszip | ^3.10.1 | ZIP file creation |

## Styling

| Package | Version | Role |
|---------|---------|------|
| Tailwind CSS | ^4 | Utility-first CSS |
| @tailwindcss/postcss | ^4 | PostCSS integration |
| clsx | ^2.1.1 | Conditional classnames |
| tailwind-merge | ^3.4.0 | Merge Tailwind classes |

## Email

| Package | Version | Role |
|---------|---------|------|
| nodemailer | ^7.0.12 | Email sending |

## Configuration

| Package | Version | Role |
|---------|---------|------|
| dotenv | ^17.2.3 | Environment variables |

## Development Tools

| Package | Version | Role |
|---------|---------|------|
| ESLint | ^9 | Linting |
| eslint-config-next | 16.1.3 | Next.js ESLint rules |
| eslint-config-prettier | ^10.1.8 | Prettier compatibility |
| Prettier | ^3.8.0 | Code formatting |

## Testing

| Package | Version | Role |
|---------|---------|------|
| Jest | ^30.2.0 | Test runner |
| jest-environment-jsdom | ^30.2.0 | Browser environment |
| ts-jest | ^29.4.6 | TypeScript support |
| @testing-library/react | ^16.3.2 | React testing utilities |
| @testing-library/jest-dom | ^6.9.1 | DOM matchers |
| @testing-library/user-event | ^14.6.1 | User interaction simulation |

## Type Definitions

- @types/bcryptjs ^2.4.6
- @types/cheerio ^0.22.35
- @types/jest ^30.0.0
- @types/jszip ^3.4.0
- @types/node ^20
- @types/nodemailer ^7.0.5
- @types/pg ^8.16.0
- @types/react ^19
- @types/react-dom ^19

## Security Overrides

```json
{
  "overrides": {
    "hono": "4.11.4",
    "diff": "4.0.4"
  }
}
```

These overrides address known vulnerabilities in transitive dependencies.

## Optional Dependencies (Docker)

- @next/swc-linux-x64-musl ^16.1.4
- lightningcss-linux-x64-musl ^1.31.1

## NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| dev | next dev | Development server |
| build | next build | Production build |
| start | next start | Production server |
| lint | eslint . --fix | Lint and fix |
| typecheck | tsc --noEmit | Type checking |
| format | prettier --write . | Format code |
| format:check | prettier --check . | Check formatting |
| test | jest | Run tests |
| test:watch | jest --watch | Watch mode |
| test:coverage | jest --coverage | Coverage report |
