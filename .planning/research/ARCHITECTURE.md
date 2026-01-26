# Architecture Research

**Domain:** K-12 EdTech / Quiz Platform
**Researched:** 2025-01-23
**Confidence:** MEDIUM-HIGH

## Standard Architecture

### System Overview

```
+------------------------------------------------------------------+
|                        CLIENT LAYER                               |
|  +------------------+  +------------------+  +------------------+  |
|  |  Teacher Portal  |  |  Student Portal  |  |   Admin Panel    |  |
|  |  (React/Next.js) |  |  (React/Next.js) |  |  (React/Next.js) |  |
|  +--------+---------+  +--------+---------+  +--------+---------+  |
+-----------|---------------------|---------------------|------------+
            |                     |                     |
            v                     v                     v
+------------------------------------------------------------------+
|                        API GATEWAY                                |
|  +------------------------------------------------------------+  |
|  |  Auth | Rate Limiting | Routing | CORS | Request Logging   |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
            |
            v
+------------------------------------------------------------------+
|                     APPLICATION LAYER                             |
|  +----------------+  +----------------+  +--------------------+   |
|  | Content        |  | Quiz           |  | Grading            |   |
|  | Service        |  | Service        |  | Service            |   |
|  | - Upload       |  | - Creation     |  | - Auto-score       |   |
|  | - OCR/Extract  |  | - Randomize    |  | - Review queue     |   |
|  | - AI Pipeline  |  | - Delivery     |  | - Finalization     |   |
|  +-------+--------+  +-------+--------+  +-------+------------+   |
|          |                   |                   |                |
|  +----------------+  +----------------+  +--------------------+   |
|  | User           |  | Integration    |  | Analytics          |   |
|  | Service        |  | Service        |  | Service            |   |
|  | - Auth/Authz   |  | - Google OAuth |  | - Usage tracking   |   |
|  | - Profiles     |  | - Roster sync  |  | - Performance      |   |
|  | - Preferences  |  | - Grade sync   |  | - Reporting        |   |
|  +----------------+  +----------------+  +--------------------+   |
+------------------------------------------------------------------+
            |
            v
+------------------------------------------------------------------+
|                      AI INFERENCE LAYER                           |
|  +---------------------------+  +-----------------------------+   |
|  |    AI Gateway             |  |    Model Router             |   |
|  |    - Request routing      |  |    - Free tier -> Local     |   |
|  |    - Tier detection       |  |    - Paid tier -> API       |   |
|  |    - Usage metering       |  |    - Fallback handling      |   |
|  +---------------------------+  +-----------------------------+   |
|                |                              |                   |
|       +--------+---------+          +---------+---------+         |
|       |  Local Inference |          |  Cloud API        |         |
|       |  (Ollama/vLLM)   |          |  (OpenAI/Claude)  |         |
|       |  - 7B models     |          |  - GPT-4/Claude   |         |
|       |  - Self-hosted   |          |  - Pay-per-token  |         |
|       +------------------+          +-------------------+         |
+------------------------------------------------------------------+
            |
            v
+------------------------------------------------------------------+
|                       DATA LAYER                                  |
|  +------------------+  +------------------+  +------------------+  |
|  |  PostgreSQL      |  |  Redis           |  |  Object Storage  |  |
|  |  - Users         |  |  - Sessions      |  |  (S3/MinIO)      |  |
|  |  - Quizzes       |  |  - Cache         |  |  - Source docs   |  |
|  |  - Submissions   |  |  - Queue jobs    |  |  - Images        |  |
|  |  - Grades        |  |  - Rate limits   |  |  - Exports       |  |
|  +------------------+  +------------------+  +------------------+  |
+------------------------------------------------------------------+
            |
            v
+------------------------------------------------------------------+
|                   EXTERNAL INTEGRATIONS                           |
|  +------------------+  +------------------+  +------------------+  |
|  | Google Classroom |  |  OCR Service     |  |  Email Service   |  |
|  | - OAuth 2.0      |  |  - Mistral OCR   |  |  - Notifications |  |
|  | - Roster API     |  |  - Tesseract     |  |  - Invitations   |  |
|  | - Grades API     |  |  - GPT-4 Vision  |  |                  |  |
|  +------------------+  +------------------+  +------------------+  |
+------------------------------------------------------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Content Service** | Ingestion, storage, OCR, text extraction from source materials | Node.js/Python + Mistral OCR + S3 |
| **AI Pipeline** | Question extraction from content with factual grounding | Python + LangChain + RAG architecture |
| **Quiz Service** | Quiz creation, randomization, delivery, attempt tracking | Node.js + PostgreSQL + Redis |
| **Grading Service** | Auto-scoring, review queue management, grade finalization | Node.js + State machine + Event queue |
| **Integration Service** | Google Classroom OAuth, roster sync, grade passback | Node.js + Google APIs |
| **AI Gateway** | Route inference requests based on user tier, metering | Node.js/Go + Redis |
| **User Service** | Authentication, authorization, profile management | Node.js + Passport.js/NextAuth |
| **Analytics Service** | Usage tracking, performance metrics, reporting | Node.js + ClickHouse/TimescaleDB |

## Recommended Project Structure

```
quizswift/
├── apps/
│   ├── web/                      # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/           # Auth pages (login, register)
│   │   │   ├── (teacher)/        # Teacher dashboard, quiz builder
│   │   │   ├── (student)/        # Student quiz taking
│   │   │   └── (admin)/          # Admin panel
│   │   ├── components/
│   │   └── lib/
│   │
│   └── api/                      # Backend API (or /api routes in Next.js)
│       ├── modules/
│       │   ├── auth/
│       │   ├── content/
│       │   ├── quiz/
│       │   ├── grading/
│       │   ├── integration/
│       │   └── ai/
│       ├── middleware/
│       └── shared/
│
├── packages/
│   ├── database/                 # Prisma schema, migrations
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── src/                  # Generated client, utilities
│   │
│   ├── ai-pipeline/              # Python AI extraction service
│   │   ├── extractors/
│   │   ├── models/
│   │   ├── validators/
│   │   └── prompts/
│   │
│   ├── shared/                   # Shared types, utilities
│   │   ├── types/
│   │   └── utils/
│   │
│   └── ui/                       # Shared UI components
│
├── infrastructure/
│   ├── docker/
│   ├── k8s/
│   └── terraform/
│
└── docs/
```

## Architectural Patterns

### Pattern 1: Extraction-Only AI with RAG Grounding

**What:** AI extracts questions directly from provided source material rather than generating from training knowledge. Uses Retrieval-Augmented Generation to ground all outputs in source documents.

**Why:** Core value proposition is 100% factual accuracy. Hallucination prevention is critical in educational assessment.

**Implementation:**
```python
# AI Extraction Pipeline with Source Grounding
class QuestionExtractor:
    def __init__(self, model_router: ModelRouter):
        self.model_router = model_router
        self.vector_store = FAISSIndex()

    async def extract_questions(
        self,
        source_content: str,
        source_id: str,
        user_tier: UserTier
    ) -> ExtractedQuestions:
        # 1. Chunk and index source content
        chunks = self.chunk_content(source_content)
        self.vector_store.add(chunks, source_id=source_id)

        # 2. Select model based on tier
        model = self.model_router.get_model(user_tier)

        # 3. Extract with strict grounding prompt
        prompt = EXTRACTION_PROMPT.format(
            content=source_content,
            instruction="Extract ONLY questions answerable from this text. "
                       "Include page/section references. "
                       "Do NOT infer or add external knowledge."
        )

        raw_questions = await model.generate(prompt)

        # 4. Validate each question against source
        validated = []
        for q in raw_questions:
            if self.verify_grounded(q, chunks):
                validated.append(q)
            else:
                # Log hallucination attempt for monitoring
                self.log_rejection(q, source_id)

        return ExtractedQuestions(
            questions=validated,
            source_refs=self.extract_refs(validated, chunks)
        )

    def verify_grounded(self, question: Question, chunks: List[str]) -> bool:
        """Verify question and answer are grounded in source chunks."""
        # BM25 + semantic search to find supporting evidence
        evidence = self.vector_store.search(question.answer, k=3)

        # Compute similarity score
        score = self.compute_grounding_score(question.answer, evidence)

        return score > GROUNDING_THRESHOLD
```

### Pattern 2: Dual-Model Tier Architecture

**What:** Route AI requests to local models (free tier) or cloud APIs (paid tier) through a unified gateway.

**Why:** Balance cost economics with quality. Free tier uses self-hosted models; paid tier accesses more powerful cloud models.

**Implementation:**
```typescript
// AI Gateway with Tier Routing
interface ModelRouter {
  route(request: InferenceRequest): Promise<InferenceResponse>;
}

class TieredModelRouter implements ModelRouter {
  constructor(
    private localModel: LocalInference,  // Ollama/vLLM
    private cloudModel: CloudInference,  // OpenAI/Anthropic
    private usageTracker: UsageTracker
  ) {}

  async route(request: InferenceRequest): Promise<InferenceResponse> {
    const user = await this.getUser(request.userId);

    if (user.tier === 'free') {
      // Check rate limits for free tier
      if (await this.usageTracker.isOverLimit(user.id, 'free')) {
        throw new RateLimitError('Daily extraction limit reached');
      }

      // Route to local model
      const response = await this.localModel.generate(request);
      await this.usageTracker.record(user.id, 'local', response.tokens);
      return response;
    }

    if (user.tier === 'paid') {
      // Route to cloud API with usage tracking
      const response = await this.cloudModel.generate(request);
      await this.usageTracker.record(user.id, 'cloud', response.tokens);
      return response;
    }

    throw new InvalidTierError();
  }
}

// Local inference wrapper (Ollama)
class OllamaInference implements LocalInference {
  async generate(request: InferenceRequest): Promise<InferenceResponse> {
    const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
      method: 'POST',
      body: JSON.stringify({
        model: 'llama3.1:7b',  // Or mistral, phi-3, etc.
        prompt: request.prompt,
        stream: false
      })
    });
    return this.parseResponse(response);
  }
}
```

### Pattern 3: Grading State Machine

**What:** Model grade lifecycle as explicit state machine: `ungraded` -> `auto_scored` -> `pending_review` -> `approved` -> `synced`.

**Why:** Clear audit trail, explicit transitions, prevents invalid state changes, enables partial automation.

**Implementation:**
```typescript
// Grade State Machine
type GradeState =
  | 'ungraded'
  | 'auto_scored'
  | 'pending_review'
  | 'approved'
  | 'synced'
  | 'sync_failed';

interface GradeTransition {
  from: GradeState;
  to: GradeState;
  event: string;
  guard?: (submission: Submission) => boolean;
  action?: (submission: Submission) => Promise<void>;
}

const GRADE_TRANSITIONS: GradeTransition[] = [
  {
    from: 'ungraded',
    to: 'auto_scored',
    event: 'SUBMIT',
    action: async (sub) => {
      sub.autoScore = calculateScore(sub.answers, sub.quiz.answerKey);
      sub.scoredAt = new Date();
    }
  },
  {
    from: 'auto_scored',
    to: 'pending_review',
    event: 'QUEUE_REVIEW',
    guard: (sub) => sub.quiz.requiresReview
  },
  {
    from: 'auto_scored',
    to: 'approved',
    event: 'AUTO_APPROVE',
    guard: (sub) => !sub.quiz.requiresReview
  },
  {
    from: 'pending_review',
    to: 'approved',
    event: 'TEACHER_APPROVE',
    action: async (sub) => {
      sub.finalScore = sub.adjustedScore ?? sub.autoScore;
      sub.approvedAt = new Date();
      sub.approvedBy = getCurrentTeacher();
    }
  },
  {
    from: 'approved',
    to: 'synced',
    event: 'SYNC_SUCCESS',
    action: async (sub) => {
      sub.syncedAt = new Date();
      sub.googleSubmissionId = sub.syncResult.id;
    }
  },
  {
    from: 'approved',
    to: 'sync_failed',
    event: 'SYNC_FAILURE',
    action: async (sub) => {
      sub.syncError = sub.syncResult.error;
      sub.syncRetryCount++;
    }
  },
  {
    from: 'sync_failed',
    to: 'synced',
    event: 'RETRY_SUCCESS'
  }
];
```

### Pattern 4: Event-Driven Processing Pipeline

**What:** Use async event queues for long-running operations (content processing, AI extraction, grade sync).

**Why:** Decouple request handling from processing. Enables retry, monitoring, and graceful degradation.

**Implementation:**
```typescript
// Event Types
type ContentEvent =
  | { type: 'CONTENT_UPLOADED'; contentId: string; userId: string }
  | { type: 'OCR_COMPLETE'; contentId: string; text: string }
  | { type: 'EXTRACTION_REQUESTED'; contentId: string; options: ExtractionOptions }
  | { type: 'EXTRACTION_COMPLETE'; contentId: string; questions: Question[] };

type GradingEvent =
  | { type: 'QUIZ_SUBMITTED'; submissionId: string }
  | { type: 'GRADES_APPROVED'; quizId: string; submissionIds: string[] }
  | { type: 'SYNC_REQUESTED'; submissionId: string }
  | { type: 'SYNC_COMPLETED'; submissionId: string; googleId: string };

// Worker Processing
class ContentWorker {
  constructor(
    private queue: Queue<ContentEvent>,
    private ocrService: OCRService,
    private aiPipeline: AIPipeline
  ) {}

  async process(event: ContentEvent): Promise<void> {
    switch (event.type) {
      case 'CONTENT_UPLOADED':
        const content = await this.getContent(event.contentId);
        if (content.requiresOCR) {
          await this.queue.publish({
            type: 'OCR_REQUESTED',
            contentId: event.contentId
          });
        }
        break;

      case 'OCR_COMPLETE':
        await this.updateContent(event.contentId, { extractedText: event.text });
        // Auto-trigger extraction if configured
        break;

      case 'EXTRACTION_REQUESTED':
        const questions = await this.aiPipeline.extract(event.contentId);
        await this.queue.publish({
          type: 'EXTRACTION_COMPLETE',
          contentId: event.contentId,
          questions
        });
        break;
    }
  }
}
```

## Data Flow

### Quiz Creation Flow

```
Teacher uploads               AI Pipeline processes         Teacher reviews
textbook content              and extracts questions        and approves
      |                              |                            |
      v                              v                            v
+----------+    +--------+    +------------+    +--------+    +---------+
| Upload   |--->| Queue  |--->| OCR/Extract|--->| Review |--->| Publish |
| Content  |    | Job    |    | Questions  |    | Draft  |    | Quiz    |
+----------+    +--------+    +------------+    +--------+    +---------+
      |                              |                            |
      v                              v                            v
  S3 Storage              PostgreSQL + Vector DB            Quiz ready
  (source docs)           (questions + embeddings)          for students

State transitions:
UPLOADED -> PROCESSING -> EXTRACTED -> DRAFT -> PUBLISHED
```

### Quiz Taking Flow

```
Student starts quiz    Student answers     Auto-grading         Teacher review
                       questions           calculates score
      |                    |                    |                    |
      v                    v                    v                    v
+-----------+    +---------------+    +-------------+    +--------------+
| Load Quiz |--->| Track Answers |--->| Score Quiz  |--->| Review Queue |
| (random)  |    | (real-time)   |    | (auto)      |    | (manual)     |
+-----------+    +---------------+    +-------------+    +--------------+
      |                    |                    |                    |
      v                    v                    v                    v
  Randomized         Answer saved          Submission          Grade approved
  question order     on each change        auto_scored         and finalized

Randomization algorithm: Fisher-Yates shuffle with seed per student+quiz
```

### Grade Sync Flow

```
Teacher approves      Queue sync job      Call Google         Update status
grades                                    Classroom API
      |                    |                    |                    |
      v                    v                    v                    v
+----------+    +-----------+    +----------------+    +------------+
| Approve  |--->| Sync Job  |--->| PATCH          |--->| Mark       |
| Grades   |    | Queue     |    | StudentSubmit  |    | Synced     |
+----------+    +-----------+    +----------------+    +------------+
      |                                  |                    |
      |                                  v                    v
      |                          +----------------+    +------------+
      |                          | Retry on       |    | Sync Error |
      |                          | failure (3x)   |    | Dashboard  |
      |                          +----------------+    +------------+
      v
  Batch approve
  all or selected

Google Classroom API endpoints:
- courses.courseWork.studentSubmissions.patch
  - assignedGrade: number (final grade)
  - draftGrade: number (teacher-only visible)
```

## Database Schema (Core Tables)

```sql
-- Users and Auth
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL, -- 'teacher', 'student', 'admin'
  tier VARCHAR(50) DEFAULT 'free', -- 'free', 'paid'
  google_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Source Content
CREATE TABLE content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  file_path VARCHAR(500), -- S3 path
  extracted_text TEXT,
  status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, processing, ready, failed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quizzes
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id),
  content_id UUID REFERENCES content(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, published, archived
  requires_review BOOLEAN DEFAULT true,
  time_limit_minutes INT,
  shuffle_questions BOOLEAN DEFAULT true,
  shuffle_answers BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Questions
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  content_id UUID REFERENCES content(id),
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) NOT NULL, -- multiple_choice, true_false, short_answer
  correct_answer TEXT NOT NULL,
  source_reference TEXT, -- Page/section reference in source
  points DECIMAL(5,2) DEFAULT 1.0,
  position INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Answer Options (for multiple choice)
CREATE TABLE answer_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT false,
  position INT NOT NULL
);

-- Quiz Attempts
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id),
  student_id UUID REFERENCES users(id),
  status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, submitted, auto_scored, pending_review, approved, synced
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  auto_score DECIMAL(5,2),
  adjusted_score DECIMAL(5,2),
  final_score DECIMAL(5,2),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  synced_at TIMESTAMPTZ,
  google_submission_id VARCHAR(255),
  question_order JSONB, -- Randomized order for this attempt
  UNIQUE(quiz_id, student_id)
);

-- Student Answers
CREATE TABLE answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id),
  selected_option_id UUID REFERENCES answer_options(id),
  text_answer TEXT,
  is_correct BOOLEAN,
  points_earned DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(submission_id, question_id)
);

-- Google Classroom Integration
CREATE TABLE classroom_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES users(id),
  google_course_id VARCHAR(255) NOT NULL,
  course_name VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  roster_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(teacher_id, google_course_id)
);

CREATE TABLE roster_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_link_id UUID REFERENCES classroom_links(id) ON DELETE CASCADE,
  student_id UUID REFERENCES users(id),
  google_student_id VARCHAR(255),
  synced_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| **< 1K users** | Monolithic Next.js app, single PostgreSQL, local Ollama on same server, synchronous processing |
| **1K - 10K users** | Separate API from frontend, Redis for caching/sessions, BullMQ for async jobs, dedicated Ollama server |
| **10K - 100K users** | Microservices split (content, quiz, grading, integration), read replicas for PostgreSQL, dedicated AI inference cluster with load balancing |
| **100K+ users** | Kubernetes orchestration, horizontal pod autoscaling, distributed AI inference (vLLM cluster), CDN for static assets, consider multi-region |

### AI Inference Scaling

| Tier | Setup | Capacity |
|------|-------|----------|
| **Development** | Single Ollama instance, 7B model | ~10 concurrent requests |
| **Production (small)** | Ollama with GPU (RTX 3090/4090), 7B model | ~50 concurrent requests |
| **Production (medium)** | vLLM cluster, 2-4 A100 GPUs, 7B-13B models | ~200 concurrent requests |
| **Production (large)** | Hybrid: vLLM cluster for free tier + cloud APIs for paid tier with intelligent routing | ~1000+ concurrent requests |

## Anti-Patterns

### Anti-Pattern 1: Synchronous AI Processing

**What:** Calling AI extraction in the HTTP request/response cycle.

**Why bad:** AI extraction takes 10-60 seconds. Users see timeout errors, retries create duplicate jobs, server resources blocked.

**Instead:** Queue extraction jobs, return job ID immediately, poll for status or use webhooks.

```typescript
// BAD: Synchronous
app.post('/api/extract', async (req, res) => {
  const questions = await aiPipeline.extract(req.body.contentId); // 30s+
  res.json(questions);
});

// GOOD: Async with queue
app.post('/api/extract', async (req, res) => {
  const job = await extractionQueue.add({
    contentId: req.body.contentId,
    userId: req.user.id
  });
  res.json({ jobId: job.id, status: 'queued' });
});

app.get('/api/extract/:jobId/status', async (req, res) => {
  const job = await extractionQueue.getJob(req.params.jobId);
  res.json({ status: job.status, progress: job.progress });
});
```

### Anti-Pattern 2: Storing AI Model in Database

**What:** Saving AI-generated content without source references.

**Why bad:** Cannot verify accuracy later, no audit trail for hallucination detection, loses connection to source material.

**Instead:** Always store source_content_id, source_reference (page/section), extraction_confidence with every extracted question.

### Anti-Pattern 3: Direct Google API Calls Without Queue

**What:** Syncing grades to Google Classroom directly in the approval endpoint.

**Why bad:** Google API has rate limits, network failures cause partial syncs, no retry mechanism.

**Instead:** Queue sync jobs with retry logic, track sync status per submission, provide manual retry UI.

### Anti-Pattern 4: Monolithic Grade State

**What:** Single `graded: boolean` field for submissions.

**Why bad:** Cannot track review workflow, no audit trail, cannot partially release grades.

**Instead:** Explicit state machine with timestamps at each transition (see Pattern 3).

### Anti-Pattern 5: Client-Side Question Randomization

**What:** Shuffling questions in the browser before displaying quiz.

**Why bad:** Students can inspect network requests to see original order, refresh gets different order, no consistency for review.

**Instead:** Server-side randomization with seed stored in submission record. Same student always sees same order for that attempt.

```typescript
// Generate deterministic shuffle for student+quiz
function getQuestionOrder(quizId: string, studentId: string, questions: Question[]): number[] {
  const seed = hashCode(`${quizId}-${studentId}`);
  const rng = seedrandom(seed);
  return fisherYatesShuffle(questions.map((_, i) => i), rng);
}
```

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Google Classroom** | OAuth 2.0 + REST API | Requires Google Workspace admin approval. Use incremental auth scopes. Roster sync via `courses.students.list`, grade sync via `courses.courseWork.studentSubmissions.patch`. |
| **OCR Service** | API call or self-hosted | Mistral OCR (best for complex layouts), Tesseract (open source fallback), GPT-4 Vision (multimodal, expensive). Process async via queue. |
| **Local LLM** | Ollama HTTP API | Run `ollama serve`, call `http://localhost:11434/api/generate`. Models: Llama 3.1 7B, Mistral 7B, Phi-3. |
| **Cloud LLM** | OpenAI/Anthropic SDK | Use official SDKs. Implement exponential backoff. Track token usage for billing. |
| **Email** | SendGrid/Resend/AWS SES | Transactional emails for invitations, grade notifications. |
| **Object Storage** | S3/MinIO/Cloudflare R2 | Store uploaded content, generated exports. Use presigned URLs for direct upload. |

### Google Classroom Integration Detail

```typescript
// OAuth 2.0 Flow
const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students',
  'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
];

// Roster Sync
async function syncRoster(classroomLinkId: string): Promise<void> {
  const link = await getClassroomLink(classroomLinkId);
  const classroom = google.classroom({ version: 'v1', auth: link.oauth2Client });

  const { data } = await classroom.courses.students.list({
    courseId: link.googleCourseId,
    pageSize: 100
  });

  for (const student of data.students || []) {
    await upsertRosterEntry({
      classroomLinkId,
      googleStudentId: student.userId,
      email: student.profile.emailAddress,
      name: student.profile.name.fullName
    });
  }
}

// Grade Sync
async function syncGrade(submissionId: string): Promise<void> {
  const submission = await getSubmission(submissionId);
  const link = await getClassroomLink(submission.quiz.classroomLinkId);
  const classroom = google.classroom({ version: 'v1', auth: link.oauth2Client });

  // First, create CourseWork if not exists
  const courseWork = await ensureCourseWork(classroom, link, submission.quiz);

  // Then update student submission grade
  await classroom.courses.courseWork.studentSubmissions.patch({
    courseId: link.googleCourseId,
    courseWorkId: courseWork.id,
    id: submission.googleSubmissionId,
    updateMask: 'assignedGrade,draftGrade',
    requestBody: {
      assignedGrade: submission.finalScore,
      draftGrade: submission.finalScore
    }
  });
}
```

## Compliance Considerations (FERPA/COPPA)

| Requirement | Implementation |
|-------------|----------------|
| **Data minimization** | Collect only necessary student data. No behavioral tracking beyond quiz performance. |
| **Consent** | Schools provide consent for students under 13 (COPPA school consent exception). Document in ToS. |
| **Data isolation** | Tenant isolation at database level. No cross-school data access. |
| **Audit logging** | Log all data access, exports, and sharing. Retain for compliance audits. |
| **Data deletion** | Implement data export and deletion on request. Document retention periods. |
| **AI transparency** | Log AI model inputs/outputs. Enable teacher override of all AI decisions. |
| **Third-party vetting** | Document all third-party services (Google, LLM providers). Ensure DPAs in place. |

## Build Order Recommendations

Based on component dependencies:

### Phase 1: Core Foundation
1. **User Service** - Authentication/authorization (blocks everything)
2. **Basic Quiz Service** - Manual quiz creation (proves core value)
3. **Quiz Taking** - Student experience with manual quizzes

### Phase 2: Content Pipeline
4. **Content Upload** - File storage and basic text extraction
5. **OCR Integration** - PDF/image processing
6. **AI Extraction Pipeline** - Question generation from content

### Phase 3: Grading Workflow
7. **Auto-Scoring** - Automatic grade calculation
8. **Review Queue** - Teacher approval workflow
9. **Grade State Machine** - Full state tracking

### Phase 4: Integration
10. **Google OAuth** - Authentication link
11. **Roster Sync** - Import students from Classroom
12. **Grade Sync** - Export grades to Classroom

### Phase 5: Tiered AI
13. **AI Gateway** - Request routing infrastructure
14. **Local Model** - Ollama integration for free tier
15. **Cloud Model** - OpenAI/Anthropic for paid tier
16. **Usage Metering** - Track and limit by tier

**Rationale:** Each phase builds on previous, enables testing at each stage. Integration deferred because it requires working quiz flow first. Tiered AI last because basic extraction should work first.

## Sources

### Architecture & Patterns
- [Classloom - Building a Modern Learning Platform](https://classloom.com/2025/10/31/building-a-modern-learning-platform-architecture-and-implementation-secrets/)
- [FastPix - E-learning Platform System Design](https://www.fastpix.io/blog/site-architecture-and-system-design-for-an-e-learning-platform)
- [Magic EdTech - Building Scalable K-12 Systems](https://www.magicedtech.com/blogs/how-to-build-scalable-and-trustworthy-edtech-infrastructure/)
- [WeAreBrain - EdTech Tech Stack 2025](https://wearebrain.com/blog/best-tech-stack-edtech-2025/)

### Google Classroom API
- [Google Developers - Manage Grades](https://developers.google.com/workspace/classroom/guides/classroom-api/manage-grades)
- [Google Developers - StudentSubmissions REST Resource](https://developers.google.com/workspace/classroom/reference/rest/v1/courses.courseWork.studentSubmissions)
- [Google Developers - API Structure](https://developers.google.com/workspace/classroom/guides/key-concepts/api-structure)

### AI Document Processing
- [Extend.ai - Document Ingestion Guide 2025](https://www.extend.ai/resources/document-ingestion-ai-processing-guide)
- [Mistral AI - Mistral OCR](https://mistral.ai/news/mistral-ocr)
- [InfoQ - AI Transforming Document Processing](https://www.infoq.com/articles/ocr-ai-document-processing/)

### Quiz Database Design
- [Tutorials24x7 - Quiz Database Design in MySQL](https://www.tutorials24x7.com/mysql/guide-to-design-database-for-quiz-in-mysql)
- [MoodleDocs - Quiz Database Structure](https://docs.moodle.org/dev/Quiz_database_structure)

### Randomization Algorithms
- [ResearchGate - Fisher-Yates Shuffle for Question Generation](https://www.researchgate.net/publication/374830859_Design_of_Question_Generator_System_QPGS_Using_Fisher-Yates_Shufling_Algorithm)
- [IEEE - Randomization Techniques in Programming Assessment](https://ieeexplore.ieee.org/document/10342976/)

### RAG & Hallucination Prevention
- [arXiv - Mitigating Hallucination in LLMs](https://arxiv.org/html/2510.24476v1)
- [Frontiers - MEGA-RAG Framework](https://www.frontiersin.org/journals/public-health/articles/10.3389/fpubh.2025.1635381/full)
- [AWS - Detect Hallucinations for RAG Systems](https://aws.amazon.com/blogs/machine-learning/detect-hallucinations-for-rag-based-systems/)

### Dual-Model Architecture
- [Medium - Localhost AI in 2025](https://medium.com/elevate-tech/a-case-for-localhost-ai-in-2025-local-llm-inference-without-expensive-tokens-0b2838e4ed14)
- [Dev.to - Production-Grade Local LLM System](https://dev.to/chnghia/decoupling-the-ai-stack-how-to-architect-a-production-grade-local-llm-system-1a0c)

### Event-Driven Architecture
- [Confluent - Event-Driven Architecture Introduction](https://www.confluent.io/learn/event-driven-architecture/)
- [DZone - Messaging Workflows with State Machines](https://dzone.com/articles/fault-tolerant-workflows-with-state-machine-architecture)

### Grading Workflows
- [arXiv - Automated Grading Workflows](https://arxiv.org/html/2309.12924v2)
- [Lafayette Help - Grading Workflow in Moodle](https://help.lafayette.edu/using-grading-workflow-in-moodle/)

### Compliance
- [6B Education - Privacy-Compliant EdTech Systems](https://6b.education/insight/building-privacy-compliant-systems-edtech-development-under-gdpr-coppa-and-ferpa/)
- [SchoolAI - FERPA COPPA Compliance Guide](https://schoolai.com/blog/ensuring-ferpa-coppa-compliance-school-ai-infrastructure)
- [Student Privacy ED.gov](https://studentprivacy.ed.gov/)
