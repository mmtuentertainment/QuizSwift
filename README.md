# QuizSwift

Quiz generation platform for K-12 teachers that extracts factually accurate assessments from textbook content.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

## Requirements

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- Ollama (for local AI inference)

## Environment Variables

Create a `.env.local` file with these variables:

```env
# Database (Neon PostgreSQL recommended)
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # For migrations

# Auth.js
AUTH_SECRET="your-secret"
AUTH_GOOGLE_ID="your-google-oauth-id"
AUTH_GOOGLE_SECRET="your-google-oauth-secret"

# Cloudflare R2 Storage (FERPA-compliant private storage)
CLOUDFLARE_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket"

# Ollama (local AI - required)
OLLAMA_HOST="http://localhost:11434"

# Optional: OpenAI fallback
OPENAI_API_KEY=""
```

## Ollama Setup

QuizSwift uses Ollama for local AI inference (free, private, FERPA-compliant).

```bash
# Install Ollama
# https://ollama.com/download

# Pull required models
ollama pull hermes2pro-32k    # Question extraction
ollama pull mxbai-embed-large # Embeddings

# Start Ollama
ollama serve
```

## Database Setup

```bash
# Push schema to database
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Run migrations (production)
npm run db:migrate

# Reset database (development only)
npm run db:reset
```

## Development

```bash
# Start Next.js dev server (port 3000)
npm run dev

# Start Inngest dev server (port 8288)
npx inngest-cli@latest dev

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

## Architecture

```
src/
├── app/                 # Next.js App Router pages
│   ├── (dashboard)/     # Protected dashboard routes
│   ├── api/             # API routes
│   └── login/           # Authentication
├── components/          # React components
├── lib/                 # Utilities
│   ├── ai/              # AI providers and extraction
│   ├── pdf/             # PDF processing
│   └── storage/         # R2 storage
├── inngest/             # Background jobs
└── generated/           # Prisma client
```

## Key Features

- **PDF Processing**: Extract text from PDFs with OCR support for scanned documents
- **AI Question Extraction**: 5-pass reasoning pipeline using Bloom's Taxonomy
- **Grounding Verification**: All questions verified against source material
- **Private Storage**: Cloudflare R2 with presigned URLs (FERPA-compliant)
- **Audit Logging**: Full audit trail with PostgreSQL triggers

## License

MIT
