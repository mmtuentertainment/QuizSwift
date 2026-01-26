# Architecture Overview

## Pattern

**Next.js App Router** with layered service architecture

## Architectural Layers

### 1. Presentation Layer
- React Server Components (RSC) for initial render
- Client Components for interactivity
- Tailwind CSS for styling

### 2. API Layer
- Next.js Route Handlers (`app/api/`)
- REST-style endpoints
- Request validation and rate limiting

### 3. Authentication Layer
- NextAuth.js v5 integration
- Session management
- OAuth and credentials providers

### 4. Service Layer
- Business logic encapsulation
- AI provider orchestration
- Content processing pipelines

### 5. Data Access Layer
- Prisma ORM client
- Type-safe database queries
- Transaction management

### 6. Integration Layer
- External API clients (OpenAI, Groq)
- Content extractors (YouTube, web)
- Export generators (PDF, ZIP)

### 7. Infrastructure Layer
- Database (PostgreSQL)
- File storage
- Email transport

## Data Flow

### Quiz Generation Flow

```
User Input (topic/content)
    ↓
API Route Handler
    ↓
Content Extraction Service
    ├── YouTube Transcript
    ├── Web Scraping
    └── Direct Text
    ↓
AI Service
    ├── OpenAI (primary)
    └── Groq (fallback)
    ↓
Quiz Generation
    ↓
Database Persistence
    ↓
Response to Client
```

### Authentication Flow

```
Login Request
    ↓
NextAuth Handler
    ├── OAuth Provider
    │   └── Token Exchange
    └── Credentials Provider
        └── Password Verification
    ↓
Session Creation
    ↓
JWT/Database Session
    ↓
Protected Route Access
```

## Key Abstractions

### AI Provider Interface

Unified interface for AI providers enabling:
- Provider switching
- Fallback handling
- Consistent response format

### Content Extractor

Abstract content extraction from various sources:
- URL-based extraction
- Video transcript parsing
- Raw text processing

### Quiz Builder

Domain model for quiz construction:
- Question types
- Answer validation
- Scoring logic

## Entry Points

### Web Application
- `app/page.tsx` - Landing page
- `app/dashboard/` - User dashboard
- `app/quiz/` - Quiz taking interface

### API Endpoints
- `app/api/auth/` - Authentication routes
- `app/api/quiz/` - Quiz CRUD operations
- `app/api/generate/` - AI generation endpoints

### Background Jobs
- None currently (all synchronous)

## Server vs Client Boundary

### Server Components (Default)
- Page layouts
- Data fetching
- Static content

### Client Components ('use client')
- Interactive forms
- Real-time updates
- Browser APIs

## State Management

### Server State
- Database via Prisma
- Session via NextAuth

### Client State
- React useState/useReducer
- Form state
- UI state

## Error Handling Strategy

### API Layer
- Try-catch with typed errors
- HTTP status codes
- Error response format

### UI Layer
- Error boundaries
- Loading states
- User-friendly messages

## Security Architecture

### Authentication
- NextAuth.js session management
- bcryptjs password hashing
- OAuth token handling

### Authorization
- Route-level protection
- API middleware validation
- Resource ownership checks

### Input Validation
- Server-side validation
- Type coercion
- Sanitization

## Scalability Considerations

### Current Limitations
- In-memory rate limiting (not distributed)
- Synchronous AI processing
- Single-region deployment

### Future Improvements
- Redis for distributed state
- Queue-based AI processing
- CDN for static assets
