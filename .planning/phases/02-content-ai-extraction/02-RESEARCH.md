# Phase 2: Content & AI Extraction - Research

**Researched:** 2026-01-23
**Domain:** PDF Processing, OCR, LLM Extraction, RAG Architecture
**Confidence:** HIGH

## Summary

Phase 2 implements a multi-stage pipeline for uploading PDFs, extracting text (with OCR for scanned documents), and using LLMs to identify existing quiz questions from the source material. The critical differentiator is **extraction-only** (finding questions that exist in the text) rather than generation (creating new questions), which eliminates hallucination risk for factual content.

The recommended architecture uses:
- **unpdf** for text-native PDF extraction with page number tracking
- **Tesseract.js** for OCR on scanned/image-based PDFs
- **Vercel AI SDK v6** with structured output for question extraction
- **pgvector** for embedding storage and grounding verification
- **Inngest** for async job processing (avoids serverless timeouts)
- **Vercel Blob** or **AWS S3** for PDF file storage

**Primary recommendation:** Build a verification pipeline that extracts questions, embeds them, and verifies each question can be grounded back to specific source text with page citations. Reject or flag any extraction that cannot achieve a minimum similarity threshold.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| unpdf | latest | Text extraction from PDFs | UnJS ecosystem, serverless-optimized PDF.js v5.4, zero deps, async API |
| tesseract.js | 6.x | OCR for scanned PDFs | Pure JS, 100+ languages, v6 has improved memory management |
| ai (Vercel AI SDK) | 6.x | LLM integration | 20M+ monthly downloads, unified API, structured output, provider-agnostic |
| ollama-ai-provider | latest | Local LLM via Ollama | Community provider for Vercel AI SDK, free tier support |
| @ai-sdk/openai | latest | OpenAI integration | Official Vercel provider for paid tier |
| inngest | latest | Background job processing | Serverless-native, handles long-running tasks, 100K free executions/mo |
| pgvector | 0.8.x | Vector storage in PostgreSQL | Native Postgres extension, works with Neon, avoids separate vector DB |
| zod | 3.x | Schema validation | Standard for Vercel AI SDK structured output |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @vercel/blob | latest | PDF file storage | If staying fully in Vercel ecosystem |
| @aws-sdk/client-s3 | 3.x | S3 file storage | If using AWS S3 for file storage |
| pdf.js (pdfjs-dist) | 5.x | PDF rendering to canvas | Only if unpdf's built-in doesn't suffice |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| unpdf | pdf-parse | unpdf is more modern, better serverless support, but pdf-parse has longer track record |
| pgvector | Pinecone/FAISS | pgvector keeps everything in Postgres (simpler), but dedicated vector DBs scale better for millions of embeddings |
| Inngest | BullMQ + Redis | BullMQ needs separate Redis server; Inngest is serverless-native |
| Tesseract.js | Scribe.js | Scribe.js has better PDF support but less documentation |

**Installation:**
```bash
npm install unpdf tesseract.js ai @ai-sdk/openai ollama-ai-provider inngest zod @vercel/blob
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── pdf/
│   │   ├── extract-text.ts      # unpdf text extraction
│   │   ├── detect-scanned.ts    # Detect if PDF needs OCR
│   │   ├── ocr.ts               # Tesseract.js OCR processing
│   │   └── chunk.ts             # Text chunking with page tracking
│   ├── ai/
│   │   ├── providers.ts         # Ollama/OpenAI provider setup
│   │   ├── extract-questions.ts # LLM question extraction
│   │   ├── embed.ts             # Text embedding functions
│   │   └── verify-grounding.ts  # Similarity verification
│   └── storage/
│       ├── blob.ts              # Vercel Blob or S3 wrapper
│       └── vectors.ts           # pgvector operations
├── inngest/
│   ├── client.ts                # Inngest client
│   └── functions/
│       ├── process-pdf.ts       # Main PDF processing job
│       ├── extract-text.ts      # Text extraction step
│       ├── run-ocr.ts           # OCR step (if needed)
│       └── extract-questions.ts # AI extraction step
└── app/
    └── api/
        ├── inngest/route.ts     # Inngest webhook handler
        └── upload/route.ts      # PDF upload endpoint
```

### Pattern 1: Multi-Stage Extraction Pipeline
**What:** Break PDF processing into discrete, resumable steps
**When to use:** Always - PDFs can be large, processing is slow
**Example:**
```typescript
// Source: Inngest documentation
import { inngest } from "./client";

export const processPdf = inngest.createFunction(
  { id: "process-pdf", retries: 3 },
  { event: "pdf/uploaded" },
  async ({ event, step }) => {
    // Step 1: Extract text (resumable)
    const text = await step.run("extract-text", async () => {
      const buffer = await fetchPdfFromStorage(event.data.fileUrl);
      return extractTextWithPages(buffer);
    });

    // Step 2: OCR if needed (long-running)
    const needsOcr = await step.run("detect-ocr-needed", async () => {
      return detectScannedPdf(text);
    });

    if (needsOcr) {
      const ocrText = await step.run("run-ocr", async () => {
        return runOcrOnPdf(event.data.fileUrl);
      });
      text.pages = ocrText.pages;
    }

    // Step 3: Chunk with page tracking
    const chunks = await step.run("chunk-text", async () => {
      return chunkTextWithCitations(text);
    });

    // Step 4: Extract questions with AI
    const questions = await step.run("extract-questions", async () => {
      return extractQuestionsFromChunks(chunks);
    });

    // Step 5: Verify grounding
    const verified = await step.run("verify-grounding", async () => {
      return verifyQuestionsAgainstSource(questions, chunks);
    });

    return { questions: verified };
  }
);
```

### Pattern 2: Structured Output for Question Extraction
**What:** Use Zod schemas with Vercel AI SDK for type-safe extraction
**When to use:** All AI extraction calls
**Example:**
```typescript
// Source: Vercel AI SDK docs
import { generateText, Output } from 'ai';
import { z } from 'zod';

const QuestionSchema = z.object({
  question: z.string().describe('The exact question text found in the source'),
  type: z.enum(['multiple_choice', 'true_false', 'fill_blank', 'short_answer'])
    .describe('The question type based on format'),
  options: z.array(z.string()).nullable()
    .describe('Answer options if multiple choice, null otherwise'),
  correctAnswer: z.string().describe('The correct answer from the source'),
  sourceQuote: z.string().describe('Exact quote from source containing this question'),
  pageNumber: z.number().describe('Page number where question was found'),
});

const ExtractionResultSchema = z.object({
  questions: z.array(QuestionSchema),
  confidence: z.number().min(0).max(1)
    .describe('Overall confidence in extraction accuracy'),
});

export async function extractQuestions(text: string, pageNumber: number) {
  const { output } = await generateText({
    model: openai('gpt-4o'),
    output: Output.object({
      name: 'QuizQuestionExtraction',
      description: 'Extract existing quiz questions from educational text',
      schema: ExtractionResultSchema,
    }),
    prompt: `You are extracting EXISTING quiz questions from educational material.

CRITICAL RULES:
1. ONLY extract questions that EXPLICITLY appear in the text
2. Do NOT generate or create new questions
3. Do NOT paraphrase - use exact wording from source
4. Include the exact source quote for verification
5. If no questions exist in the text, return empty array

Text from page ${pageNumber}:
${text}`,
  });

  return output;
}
```

### Pattern 3: Grounding Verification with Embeddings
**What:** Verify extracted questions can be matched back to source text
**When to use:** After every extraction, before storing questions
**Example:**
```typescript
// Source: pgvector + Vercel AI SDK
import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';
import { prisma } from '@/lib/prisma';

const GROUNDING_THRESHOLD = 0.85; // Minimum similarity to accept

export async function verifyGrounding(
  question: ExtractedQuestion,
  sourceChunks: Chunk[]
): Promise<VerificationResult> {
  // Embed the question
  const { embedding: questionEmbed } = await embed({
    model: openai.embeddingModel('text-embedding-3-small'),
    value: question.question + ' ' + question.sourceQuote,
  });

  // Find most similar chunk
  const result = await prisma.$queryRaw`
    SELECT id, content, page_number,
           1 - (embedding <=> ${questionEmbed}::vector) as similarity
    FROM source_chunks
    WHERE document_id = ${question.documentId}
    ORDER BY embedding <=> ${questionEmbed}::vector
    LIMIT 1
  `;

  const match = result[0];

  if (match.similarity < GROUNDING_THRESHOLD) {
    return {
      verified: false,
      status: 'ungrounded',
      similarity: match.similarity,
      message: 'Question could not be verified against source text',
    };
  }

  return {
    verified: true,
    status: 'grounded',
    similarity: match.similarity,
    sourceChunkId: match.id,
    pageNumber: match.page_number,
  };
}
```

### Anti-Patterns to Avoid
- **Single long-running request:** Never process entire PDF in one API route - use Inngest steps
- **Storing PDFs in database:** Use Vercel Blob or S3, store only references in Postgres
- **Generating questions:** System must EXTRACT only, never create new content
- **Skipping grounding verification:** Every question must be verified against source
- **Fixed chunk sizes without overlap:** Use 10-20% overlap to preserve context at boundaries
- **Hardcoded page numbers:** Track page numbers through entire pipeline, not just at extraction

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF text extraction | Custom parser | unpdf | PDF format is incredibly complex, edge cases everywhere |
| OCR processing | Call Tesseract directly | Tesseract.js worker pool | Memory management, language loading, worker lifecycle |
| LLM structured output | Parse JSON from text | Vercel AI SDK Output.object() | Handles retries, validation, schema enforcement |
| Vector similarity | Custom distance calc | pgvector operators | Optimized C code, proper indexing, SQL integration |
| Background jobs | setTimeout, cron | Inngest | Retries, observability, resumability, step functions |
| File uploads | Multipart parsing | Vercel Blob client | Handles large files, CDN distribution, security |
| Embedding generation | Direct API calls | AI SDK embed() | Provider-agnostic, batching, error handling |

**Key insight:** PDF processing and AI extraction have countless edge cases (malformed PDFs, rate limits, timeouts, encoding issues). Using battle-tested libraries prevents weeks of debugging.

## Common Pitfalls

### Pitfall 1: Serverless Timeout on Large PDFs
**What goes wrong:** Processing a 50-page PDF takes >60 seconds, Vercel times out
**Why it happens:** Vercel serverless has 10s (hobby) / 60s (pro) timeout limits
**How to avoid:** Use Inngest for all PDF processing; return immediately with job ID
**Warning signs:** Requests timing out, partial extractions, 504 errors

### Pitfall 2: OCR Memory Exhaustion
**What goes wrong:** Tesseract.js crashes on large or complex scanned documents
**Why it happens:** OCR loads entire page images into memory
**How to avoid:** Process one page at a time, terminate and recreate workers between pages
**Warning signs:** Memory errors, process crashes, incomplete OCR results

### Pitfall 3: Page Number Drift
**What goes wrong:** Extracted questions cite wrong page numbers
**Why it happens:** Page numbers lost during text chunking or processing
**How to avoid:** Embed page metadata in every chunk, never lose it through pipeline
**Warning signs:** Citations pointing to unrelated content

### Pitfall 4: Hallucinated "Extractions"
**What goes wrong:** AI generates questions that don't exist in source
**Why it happens:** LLMs naturally want to be helpful and create content
**How to avoid:** Explicit prompts forbidding generation, grounding verification, similarity thresholds
**Warning signs:** Questions with no matching source quote, low similarity scores

### Pitfall 5: Mixed PDF Types
**What goes wrong:** Text extraction returns empty/garbage for scanned PDFs
**Why it happens:** unpdf extracts embedded text, not image content
**How to avoid:** Detect scanned PDFs (low text-to-page ratio), route to OCR pipeline
**Warning signs:** Empty text extraction, garbled characters, very short text from multi-page PDFs

### Pitfall 6: Chunk Boundary Questions
**What goes wrong:** Question split across two chunks, extracted incompletely
**Why it happens:** Fixed chunking doesn't respect semantic boundaries
**How to avoid:** Use 10-20% overlap, semantic chunking, or paragraph-based splitting
**Warning signs:** Truncated questions, missing answer options

## Code Examples

Verified patterns from official sources:

### PDF Text Extraction with Page Tracking
```typescript
// Source: unpdf GitHub documentation
import { extractText, getDocumentProxy } from 'unpdf';

export async function extractTextWithPages(buffer: ArrayBuffer): Promise<PagedText> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { totalPages, text } = await extractText(pdf, { mergePages: false });

  // text is string[] when mergePages: false - one per page
  return {
    totalPages,
    pages: (text as string[]).map((content, index) => ({
      pageNumber: index + 1,
      content,
      charCount: content.length,
    })),
  };
}

export function detectScannedPdf(pagedText: PagedText): boolean {
  // If average chars per page is very low, likely scanned
  const avgChars = pagedText.pages.reduce((sum, p) => sum + p.charCount, 0) / pagedText.totalPages;
  return avgChars < 100; // Threshold for "probably scanned"
}
```

### OCR with Tesseract.js
```typescript
// Source: Tesseract.js documentation
import { createWorker } from 'tesseract.js';

export async function ocrPage(imageBuffer: Buffer): Promise<string> {
  const worker = await createWorker('eng');

  try {
    const { data: { text } } = await worker.recognize(imageBuffer);
    return text;
  } finally {
    await worker.terminate(); // Critical: prevent memory leaks
  }
}

// For multiple pages, process sequentially to manage memory
export async function ocrAllPages(pageImages: Buffer[]): Promise<string[]> {
  const results: string[] = [];

  for (const image of pageImages) {
    const text = await ocrPage(image);
    results.push(text);
  }

  return results;
}
```

### Text Chunking with Citations
```typescript
// Source: RAG chunking best practices
export interface Chunk {
  content: string;
  pageNumber: number;
  startChar: number;
  endChar: number;
  documentId: string;
}

export function chunkTextWithCitations(
  pages: PagedText['pages'],
  documentId: string,
  chunkSize = 500,
  overlap = 100
): Chunk[] {
  const chunks: Chunk[] = [];

  for (const page of pages) {
    let start = 0;

    while (start < page.content.length) {
      const end = Math.min(start + chunkSize, page.content.length);

      chunks.push({
        content: page.content.slice(start, end),
        pageNumber: page.pageNumber,
        startChar: start,
        endChar: end,
        documentId,
      });

      start += chunkSize - overlap;
    }
  }

  return chunks;
}
```

### Vercel AI SDK Provider Setup (Dual-Tier)
```typescript
// Source: Vercel AI SDK + Ollama provider docs
import { openai } from '@ai-sdk/openai';
import { ollama } from 'ollama-ai-provider';

export function getExtractionModel(tier: 'free' | 'paid') {
  if (tier === 'paid') {
    return openai('gpt-4o');
  }

  // Free tier uses local Ollama
  return ollama('llama3.1');
}

export function getEmbeddingModel(tier: 'free' | 'paid') {
  if (tier === 'paid') {
    return openai.embeddingModel('text-embedding-3-small');
  }

  // Free tier uses Ollama's embedding model
  return ollama.embeddingModel('nomic-embed-text');
}
```

### pgvector Setup in Prisma
```prisma
// schema.prisma - pgvector integration
generator client {
  provider        = "prisma-client"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  extensions = [vector]
}

model Document {
  id          String   @id @default(cuid())
  fileName    String
  fileUrl     String   // Vercel Blob or S3 URL
  totalPages  Int
  status      String   @default("pending") // pending, processing, completed, failed
  uploadedBy  String
  chunks      SourceChunk[]
  questions   ExtractedQuestion[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model SourceChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id])
  content     String
  pageNumber  Int
  startChar   Int
  endChar     Int
  embedding   Unsupported("vector(1536)")?
  createdAt   DateTime @default(now())

  @@index([documentId])
}

model ExtractedQuestion {
  id              String   @id @default(cuid())
  documentId      String
  document        Document @relation(fields: [documentId], references: [id])
  questionText    String
  questionType    String
  options         Json?    // For multiple choice
  correctAnswer   String
  sourceQuote     String
  pageNumber      Int
  verified        Boolean  @default(false)
  similarity      Float?   // Grounding similarity score
  sourceChunkId   String?
  createdAt       DateTime @default(now())

  @@index([documentId])
}
```

### Inngest Job Handler
```typescript
// Source: Inngest Next.js Quick Start
// src/app/api/inngest/route.ts
import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { processPdf } from "@/inngest/functions/process-pdf";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processPdf],
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| pdf-parse | unpdf | 2024 | Better serverless support, modern async API |
| Tesseract.js v5 | Tesseract.js v6 | 2025 | Fixed memory leaks, simplified API |
| AI SDK v5 generateObject | AI SDK v6 Output.object() | Late 2025 | Unified API, better tool support |
| Separate vector DB (Pinecone) | pgvector in Postgres | 2024-2025 | Simpler architecture, good enough for <1M vectors |
| BullMQ + Redis | Inngest | 2024-2025 | Serverless-native, no infrastructure to manage |
| AWS SDK v2 | @aws-sdk/client-s3 | 2023+ | Smaller bundle, better tree-shaking |

**Deprecated/outdated:**
- `generateObject()` / `streamObject()` - Use `generateText()` with `Output.object()` instead
- Tesseract.js v5 - Memory leaks, use v6
- pdf.js direct usage - Use unpdf wrapper for cleaner API
- AI SDK v5 with Ollama - Use v6 with updated providers

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal grounding similarity threshold**
   - What we know: 0.85 is commonly used, but may need tuning
   - What's unclear: Best threshold for educational content specifically
   - Recommendation: Start with 0.85, log all scores, tune based on false positive/negative rates

2. **Ollama embedding quality vs OpenAI**
   - What we know: nomic-embed-text is recommended for Ollama
   - What's unclear: How much quality difference affects grounding verification
   - Recommendation: Test both, may need higher threshold for Ollama embeddings

3. **Copyright implications of storing extracted questions**
   - What we know: Educational use has fair use protections
   - What's unclear: Exact legal boundaries
   - Recommendation: Defer to legal consultation (noted in STATE.md TODOs)

4. **OCR accuracy on low-quality scans**
   - What we know: Tesseract works well on clean scans
   - What's unclear: Failure modes on poor quality textbook photocopies
   - Recommendation: Add quality check, warn users about low-confidence OCR

## Sources

### Primary (HIGH confidence)
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data) - Structured output, embeddings
- [unpdf GitHub](https://github.com/unjs/unpdf) - PDF extraction API
- [Tesseract.js Documentation](https://tesseract.projectnaptha.com/) - OCR usage
- [Inngest Next.js Quick Start](https://www.inngest.com/docs/getting-started/nextjs-quick-start) - Background jobs
- [pgvector GitHub](https://github.com/pgvector/pgvector) - Vector operations
- [Neon pgvector Docs](https://neon.com/docs/extensions/pgvector) - Neon-specific setup
- [Ollama AI Provider](https://ai-sdk.dev/providers/community-providers/ollama) - Ollama with AI SDK

### Secondary (MEDIUM confidence)
- [Vercel AI SDK 6 Blog](https://vercel.com/blog/ai-sdk-6) - Latest features
- [7 PDF Parsing Libraries](https://strapi.io/blog/7-best-javascript-pdf-parsing-libraries-nodejs-2025) - Library comparison
- [Best Chunking Strategies for RAG 2025](https://www.firecrawl.dev/blog/best-chunking-strategies-rag-2025) - Chunking patterns
- [RAG with Vector Databases 2025](https://dev.to/nikhilwagh/retrieval-augmented-generation-rag-with-vector-databases-powering-context-aware-ai-in-2025-4930) - RAG architecture
- [Next.js S3 Upload Guide](https://neon.com/guides/next-upload-aws-s3) - File storage patterns

### Tertiary (LOW confidence)
- [HaluGate Token-Level Detection](https://blog.vllm.ai/2025/12/14/halugate.html) - Advanced hallucination detection (may be overkill for this use case)
- [LLM Hallucination Survey](https://arxiv.org/html/2510.24476v1) - Academic research on mitigation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via official docs
- Architecture: HIGH - Patterns from official Vercel AI SDK and Inngest docs
- Pitfalls: MEDIUM - Based on common issues reported, not all personally verified
- Grounding verification: MEDIUM - Approach is sound, specific thresholds need testing

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - libraries are stable)
