# External Integrations

## AI Providers

### OpenAI

**Package:** `openai` ^6.16.0

**Purpose:** Primary AI provider for quiz generation

**Capabilities:**
- Chat completions for quiz question generation
- Content analysis and summarization
- Topic extraction from source materials

**Configuration:**
- API key via `OPENAI_API_KEY` environment variable
- Model selection configurable per request

### Groq

**Package:** `groq-sdk` ^0.37.0

**Purpose:** Fallback/alternative AI provider

**Capabilities:**
- Fast inference for quiz generation
- Compatible API structure with OpenAI
- Cost-effective alternative

**Configuration:**
- API key via `GROQ_API_KEY` environment variable

## Database

### PostgreSQL

**Adapter:** `@prisma/adapter-pg` ^7.2.0
**Driver:** `pg` ^8.17.1

**Connection:**
- `DATABASE_URL` environment variable
- Prisma ORM manages schema and migrations
- Connection pooling via pg driver

**Schema managed by:** Prisma (`prisma/schema.prisma`)

## Authentication Providers

### NextAuth.js

**Package:** `next-auth` ^5.0.0-beta.30

**Supported Providers:**
- OAuth providers (Google, GitHub, etc.)
- Credentials-based authentication
- Email/password with bcryptjs hashing

**Configuration:**
- `AUTH_SECRET` for session encryption
- OAuth client IDs and secrets per provider
- Dangerous email linking flag enabled (security concern)

## Content Sources

### YouTube

**Package:** `youtube-transcript` ^1.2.1

**Purpose:** Extract transcripts from YouTube videos for quiz generation

**Capabilities:**
- Fetch video transcripts
- Handle multiple languages
- Process timestamped content

### Web Content

**Package:** `cheerio` ^1.1.2

**Purpose:** Parse and extract content from web pages

**Capabilities:**
- HTML parsing and manipulation
- Content extraction from articles
- DOM traversal for scraping

## Email Service

### Nodemailer

**Package:** `nodemailer` ^7.0.12

**Purpose:** Send transactional emails

**Use Cases:**
- Password reset emails
- Account verification
- Quiz sharing notifications

**Configuration:**
- SMTP settings via environment variables
- Support for various email providers

## Export Services

### PDF Generation

**Package:** `@react-pdf/renderer` ^4.3.2

**Purpose:** Generate PDF exports of quizzes

**Capabilities:**
- React-based PDF component rendering
- Custom styling and layouts
- Print-ready output

### ZIP Archives

**Package:** `jszip` ^3.10.1

**Purpose:** Bundle quiz exports

**Capabilities:**
- Create ZIP archives
- Include multiple formats
- Downloadable packages

## Environment Variables

| Variable | Service | Required |
|----------|---------|----------|
| DATABASE_URL | PostgreSQL | Yes |
| AUTH_SECRET | NextAuth | Yes |
| OPENAI_API_KEY | OpenAI | Yes |
| GROQ_API_KEY | Groq | Optional |
| SMTP_HOST | Nodemailer | Optional |
| SMTP_PORT | Nodemailer | Optional |
| SMTP_USER | Nodemailer | Optional |
| SMTP_PASS | Nodemailer | Optional |

## Integration Patterns

### AI Provider Fallback

```
Primary: OpenAI
    ↓ (on failure/rate limit)
Fallback: Groq
```

### Content Pipeline

```
Source (YouTube/Web/Text)
    ↓
Content Extraction (cheerio/youtube-transcript)
    ↓
AI Processing (OpenAI/Groq)
    ↓
Quiz Generation
    ↓
Export (PDF/ZIP)
```

## Rate Limiting

- In-memory rate limiter (not distributed)
- Per-user request tracking
- Configurable limits per endpoint

## Webhooks

No outbound webhooks configured.

## Third-Party APIs

No additional REST APIs beyond AI providers.
