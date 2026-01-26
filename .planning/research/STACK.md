# Stack Research: QuizSwift

**Domain:** K-12 EdTech / Quiz Platform
**Researched:** 2026-01-23
**Overall Confidence:** HIGH

## Executive Summary

QuizSwift requires a modern full-stack JavaScript/TypeScript stack optimized for:
1. Google Classroom integration (OAuth + Classroom API)
2. Content extraction from textbooks (PDF text, images with OCR)
3. AI-powered extraction-based quiz generation (NOT generative)
4. Local model support for cost management (Ollama/HuggingFace)
5. Math rendering for STEM subjects

The recommended stack prioritizes: type safety, serverless deployment, cost efficiency through local AI, and compliance with K-12 data privacy requirements.

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Next.js** | 16.1.x | Full-stack React framework | Industry standard for EdTech. App Router provides server components for secure data handling. Vercel deployment is optimized. React 19 support with stable React Compiler. | HIGH |
| **TypeScript** | 5.7.x | Type safety | Essential for large codebases. Prisma generates types, AI SDK is TypeScript-first. Catches errors at build time. | HIGH |
| **React** | 19.x | UI framework | Bundled with Next.js 16. Server Components enable secure API calls. Concurrent features improve perceived performance. | HIGH |

**Rationale:** Next.js 16 is the clear winner for EdTech:
- Server Components keep API keys server-side (critical for Google OAuth tokens)
- Built-in streaming for AI responses
- Turbopack for fast development iteration
- Strong ecosystem for authentication (Auth.js) and database (Prisma)

### Database & ORM

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **PostgreSQL** | 16.x | Primary database | Strict data integrity for student grades. FERPA/COPPA compliance needs audit trails. Row-level security for multi-tenant. | HIGH |
| **Prisma ORM** | 7.2.x | Database toolkit | TypeScript-first with generated types. New v7 is pure TypeScript (faster, smaller). Schema as single source of truth. | HIGH |

**Rationale:** PostgreSQL over MongoDB because:
- Student data requires strict integrity (grades cannot be corrupted)
- Complex queries for analytics (quiz performance, class averages)
- FERPA compliance needs strong transaction support
- Prisma 7's pure TypeScript rewrite is 70% faster for type checking

### Authentication

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Auth.js (NextAuth v5)** | 5.x (beta/RC) | Authentication | Native Next.js integration. 50+ OAuth providers including Google. Session management built-in. | MEDIUM |
| **googleapis** | latest | Google Classroom API | Official Google library. Classroom API v1 for courses, assignments, grade sync. | HIGH |

**Rationale:** Auth.js v5 is the path forward despite beta status:
- Production-stable in practice (widely used)
- Native Google OAuth with Classroom scope extension
- Edge-compatible with split configuration pattern
- Database adapter for Prisma included

**Note:** Auth.js v5 remains in beta (v4.24.13 is last stable). For production, use v5 beta but monitor for breaking changes.

### AI & Content Extraction

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Vercel AI SDK** | 6.x | AI abstraction layer | Unified API for multiple providers. Streaming built-in. Provider switching without code changes. | HIGH |
| **Ollama** | latest | Local LLM runtime | Free tier support. Runs Llama 3.1, Mistral locally. No API costs for extraction tasks. | HIGH |
| **ollama-js** | 0.6.x | Ollama integration | Official library. Structured outputs support. Streaming responses. | HIGH |
| **ai-sdk-ollama** | 3.x | Vercel AI + Ollama bridge | Full AI SDK compatibility. Tool calling support. Both Node.js and browser support. | HIGH |
| **Transformers.js** | 3.x | Browser ML inference | Client-side NLP for quick extractions. No server round-trip. ONNX runtime for speed. | MEDIUM |

**Rationale for extraction-based approach:**
1. **Ollama for heavy lifting:** Question extraction from long passages runs locally (free tier)
2. **Vercel AI SDK for flexibility:** Can switch to OpenAI/Anthropic for premium tier
3. **Transformers.js for client-side:** Quick entity recognition, keyword extraction

**Model Recommendations:**
- **Free Tier:** Ollama with `llama3.1:8b` or `mistral:7b-instruct`
- **Premium Tier:** OpenAI GPT-4o-mini via AI SDK (cost-effective, high quality)

### Content Extraction (PDFs & Images)

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **unpdf** | 1.4.x | PDF text extraction | Modern alternative to unmaintained pdf-parse. Serverless-optimized. Multiple extraction strategies. | HIGH |
| **Tesseract.js** | 7.x | OCR for images | Pure JavaScript OCR. 100+ languages. Works in browser and Node.js. | HIGH |
| **Scribe.js** | latest | Combined PDF+OCR | Handles both text-native and scanned PDFs. Falls back to OCR automatically. | MEDIUM |

**Rationale for extraction pipeline:**
```
Textbook Upload
    |
    v
[unpdf] --> Text-native PDF? --> Extract text directly
    |
    v (scanned/images)
[Tesseract.js] --> OCR extraction
    |
    v
[AI Extraction] --> Questions, answers, key concepts
```

### UI & Styling

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **Tailwind CSS** | 4.x | Utility-first CSS | Zero-config with Next.js. Smaller bundles via automatic content detection. | HIGH |
| **shadcn/ui** | latest | Component library | Copy-paste components (you own the code). Radix primitives. Accessible by default. | HIGH |
| **Lucide React** | latest | Icons | Default icon set for shadcn. Tree-shakeable. | HIGH |
| **Sonner** | latest | Toast notifications | Lightweight. Designed for shadcn integration. | HIGH |

**Rationale:** shadcn/ui over traditional component libraries because:
- Full code ownership (can customize everything)
- Built on Radix (accessible, production-tested)
- Tailwind v4 compatible (upgraded in recent releases)
- Used by OpenAI, Adobe, Sonos

### Math Rendering

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **KaTeX** | latest | Math typesetting | 3x faster than MathJax. No page reflow. Server-side rendering support. | HIGH |
| **react-katex** | 3.1.x | React wrapper | InlineMath and BlockMath components. SSR compatible. | HIGH |

**Rationale:** KaTeX over MathJax because:
- Synchronous rendering (no flicker)
- Smaller bundle size (~350KB vs ~1MB)
- Donald Knuth's TeX layout (gold standard)
- SSR support for SEO and initial load

### Form Handling & Validation

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| **React Hook Form** | 7.x | Form state management | Performance-optimized. Uncontrolled inputs. shadcn integration. | HIGH |
| **Zod** | 3.x | Schema validation | TypeScript-first. Prisma integration. Works client and server. | HIGH |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **pnpm** | Package manager | Faster installs, disk efficient, strict by default |
| **ESLint** | Linting | Next.js config included. Flat config in ESLint 9+ |
| **Prettier** | Formatting | Tailwind plugin for class sorting |
| **Vitest** | Unit testing | Vite-native. Faster than Jest. TypeScript support |
| **Playwright** | E2E testing | Cross-browser. Component testing support |
| **Prisma Studio** | Database GUI | New in Prisma 7. Visual relationship explorer |

---

## Installation

```bash
# Create Next.js project with TypeScript and Tailwind
npx create-next-app@latest quizswift --typescript --tailwind --eslint --app --src-dir

cd quizswift

# Core dependencies
pnpm add @prisma/client next-auth@beta googleapis
pnpm add ai @ai-sdk/openai ai-sdk-ollama ollama

# Content extraction
pnpm add unpdf tesseract.js

# UI components
pnpm dlx shadcn@latest init
pnpm add lucide-react sonner

# Math rendering
pnpm add katex react-katex
pnpm add -D @types/katex

# Forms & validation
pnpm add react-hook-form zod @hookform/resolvers

# Dev dependencies
pnpm add -D prisma vitest @playwright/test

# Initialize Prisma
npx prisma init --datasource-provider postgresql
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 | Remix | Complex nested data loading without RSC. Admin dashboards with heavy form interactions. |
| Next.js 16 | SvelteKit | Smaller team wanting simpler syntax. Performance-critical pages with minimal JS. |
| PostgreSQL | MongoDB | Highly variable quiz schema. Rapid prototyping without migrations. |
| Prisma 7 | Drizzle ORM | Edge-first deployment needing smallest bundle. Raw SQL control preferred. |
| Auth.js v5 | Clerk | Quick launch with hosted UI. Don't want to manage auth infrastructure. |
| Auth.js v5 | Lucia | Full control over auth logic. Lighter weight solution. |
| Ollama | LM Studio | Desktop app for model testing. Non-developer users running local models. |
| unpdf | pdf-parse | Legacy codebase already using it. (Note: unmaintained) |
| KaTeX | MathJax | Need obscure LaTeX commands. Accessibility with MathML output critical. |
| shadcn/ui | Chakra UI | Team familiar with styled-system. Need built-in theme switching. |
| shadcn/ui | Material UI | Enterprise design language. Complex data tables built-in. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **pdf-parse** | Unmaintained since 2019. Security vulnerabilities. | unpdf |
| **MathJax 2.x** | Legacy version. Slow, causes page reflow. | KaTeX or MathJax 3 |
| **Create React App** | Deprecated by React team. No SSR, poor SEO. | Next.js |
| **Mongoose** | For MongoDB. PostgreSQL is better for EdTech compliance. | Prisma |
| **Firebase Auth** | Vendor lock-in. Limited Google Classroom integration. | Auth.js + googleapis |
| **LangChain.js** | Over-abstraction for extraction tasks. Complex dependency tree. | Direct AI SDK + Ollama |
| **Express.js** | Separate backend adds complexity. Next.js API routes sufficient. | Next.js API Routes |
| **Yarn Classic** | Slower than pnpm. Phantom dependencies. | pnpm |
| **Jest** | Slower than Vitest. Complex TypeScript config. | Vitest |
| **OpenAI only** | Expensive for free tier. No local fallback. | Ollama for free, OpenAI for premium |

---

## Architecture Implications

### Free Tier vs Premium Tier

```
Free Tier:
  User Upload --> unpdf/Tesseract --> Ollama (local) --> Quiz Generated
  Cost: $0 per quiz (runs on user's hardware)

Premium Tier:
  User Upload --> unpdf/Tesseract --> OpenAI API --> Quiz Generated
  Cost: ~$0.01-0.05 per quiz (API calls)
```

### Google Classroom Integration Points

| Feature | API Used | Auth Scope |
|---------|----------|------------|
| Import class roster | Classroom API (courses.students) | classroom.rosters.readonly |
| Create assignment | Classroom API (courses.courseWork) | classroom.coursework.students |
| Sync grades | Classroom API (courses.courseWork.studentSubmissions) | classroom.coursework.students |
| Class creation | Classroom API (courses) | classroom.courses |

### Data Privacy Considerations

1. **FERPA Compliance:** All student data in PostgreSQL with row-level security
2. **COPPA Compliance:** No direct data collection from users under 13 (teacher-mediated)
3. **Local Processing:** Ollama option keeps content on user's machine
4. **Audit Logging:** Prisma middleware for all data access logging

---

## Sources

### Official Documentation
- [Next.js 16 Release](https://nextjs.org/blog/next-16)
- [Prisma 7 Announcement](https://www.prisma.io/blog/announcing-prisma-orm-7-0-0)
- [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6)
- [Google Classroom API Quickstart](https://developers.google.com/classroom/quickstart/nodejs)
- [Auth.js v5 Migration](https://authjs.dev/getting-started/migrating-to-v5)
- [Ollama JavaScript Library](https://github.com/ollama/ollama-js)
- [KaTeX Documentation](https://katex.org/)
- [shadcn/ui](https://ui.shadcn.com/)

### Comparison Articles
- [Next.js vs Remix vs SvelteKit 2026](https://www.nxcode.io/resources/news/nextjs-vs-remix-vs-sveltekit-2025-comparison)
- [PostgreSQL vs MongoDB 2025](https://www.sevensquaretech.com/mongodb-vs-postgresql/)
- [KaTeX vs MathJax Comparison](https://biggo.com/news/202511040733_KaTeX_MathJax_Web_Rendering_Comparison)

### Library Documentation
- [unpdf GitHub](https://github.com/unjs/unpdf)
- [Tesseract.js GitHub](https://github.com/naptha/tesseract.js)
- [Transformers.js Documentation](https://huggingface.co/docs/transformers.js/en/index)
- [ai-sdk-ollama](https://github.com/jagreehal/ai-sdk-ollama)

### npm Packages
- [@prisma/client](https://www.npmjs.com/package/@prisma/client) - v7.2.x
- [next-auth](https://www.npmjs.com/package/next-auth) - v5.x beta
- [ollama](https://www.npmjs.com/package/ollama) - v0.6.x
- [unpdf](https://www.npmjs.com/package/unpdf) - v1.4.x
- [tesseract.js](https://www.npmjs.com/package/tesseract.js) - v7.x
- [react-katex](https://www.npmjs.com/package/react-katex) - v3.1.x

---

## Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Core Framework (Next.js) | HIGH | Official docs, stable release, widespread adoption |
| Database (PostgreSQL + Prisma) | HIGH | Official docs, v7 released with major improvements |
| Authentication (Auth.js) | MEDIUM | v5 still in beta, but widely used in production |
| AI Integration (Ollama + AI SDK) | HIGH | Official libraries, active development |
| Content Extraction (unpdf, Tesseract) | HIGH | Active maintenance, well-documented |
| Math Rendering (KaTeX) | HIGH | Stable, industry standard |
| UI (shadcn/ui + Tailwind v4) | HIGH | Official compatibility confirmed |

---

## Roadmap Implications

1. **Phase 1 (Foundation):** Next.js 16 + Prisma 7 + Auth.js setup with Google OAuth
2. **Phase 2 (Content):** PDF extraction pipeline (unpdf + Tesseract)
3. **Phase 3 (AI):** Ollama integration for quiz extraction
4. **Phase 4 (Classroom):** Google Classroom API integration
5. **Phase 5 (Polish):** Math rendering, premium tier (OpenAI)

**Critical dependency:** Google Classroom API requires Google for Education account and verified OAuth application. Start OAuth verification early (takes 4-6 weeks).
