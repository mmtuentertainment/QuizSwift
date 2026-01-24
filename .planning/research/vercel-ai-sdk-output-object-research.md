# Vercel AI SDK Output.object Research

**Researched:** 2026-01-24
**Domain:** Vercel AI SDK - Structured Output Generation
**Confidence:** HIGH

## Summary

The Vercel AI SDK's `Output.object()` feature provides a unified API for generating type-safe, schema-validated structured data across multiple AI providers. It works by leveraging either **JSON mode** or **tool calling** depending on the provider's capabilities and configuration.

**Key Findings:**
- `Output.object()` is used with `generateText` and `streamText` (not the deprecated `generateObject`)
- Providers implement support through `defaultObjectGenerationMode` property (json/tool/undefined)
- The SDK automatically selects the best mode based on provider capabilities
- Works with Zod schemas, Valibot, JSON schemas, or any Standard JSON Schema V1 library
- Can be combined with tool calling in AI SDK 6, but requires careful step management

**Primary recommendation:** Use `generateText` with `Output.object({ schema })` for structured data generation, and ensure providers implement `defaultObjectGenerationMode` to specify their preferred generation strategy.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ai | 6.x | Vercel AI SDK Core | Unified API for LLM interactions, structured outputs |
| zod | 3.x+ | Schema validation | Type-safe schema definition, runtime validation |
| @ai-sdk/openai | Latest | OpenAI provider | Native structured outputs support |
| @ai-sdk/anthropic | Latest | Anthropic provider | Tool-based object generation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ai-sdk-ollama | 3.x+ | Ollama provider (local) | Free tier, local development, privacy needs |
| valibot | Latest | Schema validation | Alternative to Zod for smaller bundle size |

### Installation
```bash
npm install ai zod @ai-sdk/openai @ai-sdk/anthropic
# For local/free tier:
npm install ai-sdk-ollama
```

## Architecture Patterns

### Pattern 1: Basic Structured Output
**What:** Generate type-safe objects using `Output.object()` with schema
**When to use:** Need validated structured data from LLM responses

**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.object({
    schema: z.object({
      name: z.string(),
      age: z.number(),
      interests: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a random person profile',
});

// output is fully typed based on schema
```

### Pattern 2: Combining Tools with Structured Output
**What:** Execute tool calls and return structured data in same request (AI SDK 6)
**When to use:** Need multi-step reasoning with final structured output

**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/troubleshooting/tool-calling-with-structured-outputs
import { generateText, Output, tool } from 'ai';
import { z } from 'zod';

const { output } = await generateText({
  model: openai('gpt-4o'),
  tools: {
    getWeather: tool({
      description: 'Get weather for location',
      inputSchema: z.object({ location: z.string() }),
      execute: async ({ location }) => ({ temp: 72, condition: 'sunny' }),
    }),
  },
  output: Output.object({
    schema: z.object({
      location: z.string(),
      recommendation: z.string(),
    }),
  }),
  prompt: 'Get SF weather and recommend activities',
  // CRITICAL: Structured output counts as a step
  stopWhen: (step) => step.stepCount >= 3, // tool call + result + output
});
```

### Pattern 3: Provider-Specific Object Generation Modes
**What:** Implement custom provider with `defaultObjectGenerationMode`
**When to use:** Building custom AI provider

**Example:**
```typescript
// Source: https://ai-sdk.dev/providers/community-providers/custom-providers
import { LanguageModelV3 } from 'ai';

class CustomLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'V3';
  readonly provider = 'custom-provider';
  readonly modelId = 'custom-model';

  // Specify preferred mode for object generation
  readonly defaultObjectGenerationMode: 'json' | 'tool' | undefined = 'json';

  async doGenerate(options: LanguageModelV3CallOptions) {
    // Implementation handles both modes:
    // - 'json': Uses native JSON output (response_format: { type: 'json_object' })
    // - 'tool': Wraps schema as a tool call to extract structured data

    if (options.mode?.type === 'object') {
      const schema = options.mode.schema;
      // Use JSON mode or tool calling based on defaultObjectGenerationMode
    }
  }
}
```

### Pattern 4: Enhanced Descriptions for Better Quality
**What:** Add `.describe()` to schema properties for LLM hints
**When to use:** Improving accuracy of generated structured data

**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
const schema = z.object({
  questionText: z.string()
    .describe('The exact question text as it appears in source'),
  questionType: z.enum(['multiple_choice', 'true_false'])
    .describe('The type of question based on its format'),
  options: z.array(z.string()).nullable()
    .describe('Answer options for multiple choice, null otherwise'),
});
```

### Anti-Patterns to Avoid
- **Using deprecated `generateObject`:** Use `generateText` with `output` parameter instead
- **Insufficient steps for tool + output:** Structured output counts as a step; adjust `stopWhen` accordingly
- **Assuming all providers support both modes:** Check `defaultObjectGenerationMode` - some only support one

## How Output.object Works Under the Hood

### Two Implementation Strategies

**1. JSON Mode (response_format)**
- Provider has native JSON output capability
- AI SDK sends schema in request (OpenAI structured outputs, Ollama format parameter)
- Model generates JSON conforming to schema
- SDK validates against schema and returns typed object

**2. Tool Calling Mode**
- Provider lacks native JSON mode OR tool mode is preferred
- AI SDK converts schema into a special "json" tool definition
- Model generates a tool call with arguments matching schema
- SDK extracts tool arguments, validates, returns as structured output

### Provider Requirements

For custom providers to support `Output.object()`:

| Requirement | Type | Purpose |
|-------------|------|---------|
| `defaultObjectGenerationMode` | `'json' \| 'tool' \| undefined` | Tells SDK preferred strategy for this model |
| `doGenerate` implementation | Method | Must handle `mode: { type: 'object', schema }` |
| Schema to provider format | Conversion | Convert JSON schema to provider's format |
| Response parsing | Logic | Extract/validate structured data from response |

**Implementation decision tree:**
1. Does provider have native JSON output? → Use `'json'` mode
2. Does provider support tool calling? → Use `'tool'` mode
3. Neither? → Set to `undefined` (object generation not supported)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom JSON validators | Zod, Valibot, or Standard JSON Schema | Runtime validation, type inference, better error messages |
| Structured output from LLMs | Raw JSON parsing with prompts | `Output.object()` | Provider-agnostic, automatic validation, retry logic |
| Multi-step tool + output | Chaining `generateText` → `generateObject` | Single `generateText` with tools + output | Cleaner code, automatic step management (SDK 6) |
| JSON repair from malformed LLM output | Custom string manipulation | Provider built-in (ai-sdk-ollama has 14+ fixes) | Handles edge cases (trailing commas, single quotes, etc.) |

**Key insight:** Structured output looks simple ("just parse JSON") but has 14+ edge cases for malformed output, provider-specific formats, schema conversion complexity, and retry/error handling needs.

## Common Pitfalls

### Pitfall 1: Combining Tools and Structured Output Without Adjusting Steps
**What goes wrong:** `generateText` stops before producing structured output when using tools
**Why it happens:** Structured output generation counts as an additional step in execution flow
**How to avoid:**
```typescript
// BAD: Stops after 2 steps (tool call + result), no output
stopWhen: stepCountIs(2)

// GOOD: Allows tool call + result + output generation
stopWhen: stepCountIs(3)
```
**Warning signs:** Empty or undefined output when tools were called successfully

### Pitfall 2: Using generateObject Instead of generateText
**What goes wrong:** Cannot combine with tool calling, using deprecated API
**Why it happens:** `generateObject` is the old SDK 5 pattern, deprecated in SDK 6
**How to avoid:** Always use `generateText` with `output: Output.object({ schema })`
**Warning signs:** Deprecation warnings, inability to use tools with structured output

### Pitfall 3: Assuming JSON Mode Works for All Providers
**What goes wrong:** Some providers don't support JSON mode, cause errors
**Why it happens:** Not all LLM providers have native structured output capabilities
**How to avoid:** Check provider capabilities or let SDK auto-select via `defaultObjectGenerationMode`
**Warning signs:** Provider errors like "json mode cannot be combined with tool/function calling" (Groq), "Forced function calling (ANY mode) with response mime type: 'application/json' is unsupported" (Google)

### Pitfall 4: Not Handling AI_NoObjectGeneratedError
**What goes wrong:** Unhandled errors when model fails to generate valid structure
**Why it happens:** LLMs can fail to generate parsable JSON or violate schema
**How to avoid:**
```typescript
try {
  const { output } = await generateText({ ... });
} catch (error) {
  if (error.name === 'AI_NoObjectGeneratedError') {
    // Handle: model failed, unparsable JSON, or schema violation
    console.error('Generation failed:', error.cause);
    // Fallback logic
  }
}
```
**Warning signs:** Uncaught exceptions during object generation

### Pitfall 5: OpenAI Strict Mode Schema Incompatibilities
**What goes wrong:** Request fails due to schema features not supported in strict mode
**Why it happens:** OpenAI strict mode only supports subset of JSON Schema
**How to avoid:**
```typescript
// BAD: .optional() and .nullish() not supported in strict mode
z.object({
  name: z.string().optional(),
  age: z.number().nullish(),
})

// GOOD: Use .nullable() instead
z.object({
  name: z.string().nullable(),
  age: z.number().nullable(),
})

// OR disable strict mode
openai('gpt-4o', { strictJsonSchema: false })
```
**Warning signs:** Schema validation errors from OpenAI API

## Code Examples

### Example 1: Basic Object Generation
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { generateText, Output } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

const RecipeSchema = z.object({
  name: z.string(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string(),
  })),
  steps: z.array(z.string()),
});

const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.object({
    name: 'Recipe',
    description: 'A recipe for a dish',
    schema: RecipeSchema,
  }),
  prompt: 'Generate a lasagna recipe',
});

// output is typed as z.infer<typeof RecipeSchema>
console.log(output.name);
console.log(output.ingredients);
```

### Example 2: Streaming Structured Output
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { streamText, Output } from 'ai';

const { output } = await streamText({
  model: openai('gpt-4o'),
  output: Output.object({ schema: RecipeSchema }),
  prompt: 'Generate a lasagna recipe',
});

// Stream partial objects as they're generated
for await (const partialObject of output) {
  console.log('Partial:', partialObject);
}
```

### Example 3: Custom Provider Implementation
```typescript
// Source: https://ai-sdk.dev/providers/community-providers/custom-providers
import { LanguageModelV3, LanguageModelV3CallOptions } from 'ai';

class OllamaLanguageModel implements LanguageModelV3 {
  readonly specificationVersion = 'V3';
  readonly provider = 'ollama';
  readonly modelId: string;

  // Ollama supports native JSON format
  readonly defaultObjectGenerationMode = 'json' as const;

  constructor(modelId: string) {
    this.modelId = modelId;
  }

  async doGenerate(options: LanguageModelV3CallOptions) {
    const { mode, prompt } = options;

    // Handle object generation mode
    if (mode?.type === 'object') {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: this.modelId,
          prompt: prompt,
          format: mode.schema, // Ollama accepts JSON schema directly
          stream: false,
        }),
      });

      const result = await response.json();
      const parsed = JSON.parse(result.response);

      // Return in AI SDK format
      return {
        text: result.response,
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0 },
        // SDK will validate against schema
      };
    }

    // Handle regular text generation
    // ...
  }
}
```

### Example 4: Array and Choice Outputs
```typescript
// Source: https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data
import { Output } from 'ai';

// Array output
const { output } = await generateText({
  model: openai('gpt-4o'),
  output: Output.array({
    name: 'Questions',
    element: z.object({
      question: z.string(),
      answer: z.string(),
    }),
  }),
  prompt: 'Generate 5 quiz questions about photosynthesis',
});

// Choice output
const { output: choice } = await generateText({
  model: openai('gpt-4o'),
  output: Output.choice({
    name: 'Sentiment',
    options: ['positive', 'negative', 'neutral'],
  }),
  prompt: 'What is the sentiment of: "This product is okay"',
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `generateObject()` / `streamObject()` | `generateText()` / `streamText()` with `output` | AI SDK 6 (2025) | Unified API, can combine tools + structured output |
| Separate tool calling and object generation | Single call with both | AI SDK 6 | Simplified multi-step agentic flows |
| Provider-specific schema formats | Standard JSON Schema V1 | AI SDK 6 | Any schema library works (Zod, Valibot, ArkType) |
| Manual strict mode enablement | Per-tool strict mode | AI SDK 6 | Mix strict/non-strict tools in same request |
| Chaining `generateText` → `generateObject` | Single `generateText` with output | AI SDK 6 | Better performance, cleaner code |

**Deprecated/outdated:**
- `generateObject()` - Use `generateText` with `output: Output.object()` instead
- `streamObject()` - Use `streamText` with `output: Output.object()` instead
- `experimental_output` - Now just `output` (no longer experimental)

## Provider-Specific Details

### OpenAI
- **Mode:** Native structured outputs (JSON mode with schema)
- **Strict mode:** Enabled by default, can disable with `strictJsonSchema: false`
- **Limitations:** Strict mode doesn't support `.optional()` or `.nullish()`, use `.nullable()`
- **Best for:** Production apps needing guaranteed schema conformance

### Anthropic
- **Mode:** Tool-based (`jsonTool` or `outputFormat` depending on model)
- **Strict mode:** Not applicable (uses tool calling)
- **Limitations:** Requires tool calling capability
- **Best for:** Complex reasoning with structured output

### Ollama (ai-sdk-ollama)
- **Mode:** Native JSON format parameter
- **Auto-detection:** `structuredOutputs: true` automatic for `generateObject`
- **JSON Repair:** Handles 14+ malformed JSON issues automatically
- **Limitations:** Model-dependent (not all Ollama models support structured output)
- **Best for:** Local/free tier, privacy-sensitive applications

### Google Generative AI
- **Mode:** Response MIME type approach
- **Limitations:** Cannot combine forced function calling with JSON response type
- **Best for:** Gemini-specific features

### Groq
- **Limitations:** "json mode cannot be combined with tool/function calling"
- **Workaround:** Choose either JSON mode OR tools, not both

## Open Questions

1. **Provider capability detection**
   - What we know: `defaultObjectGenerationMode` tells SDK preferred mode
   - What's unclear: How to programmatically check if a model supports structured output before making request
   - Recommendation: Wrap in try/catch, handle `AI_NoObjectGeneratedError`

2. **Performance differences: JSON vs Tool mode**
   - What we know: Both work, different providers prefer different modes
   - What's unclear: Latency/token usage differences between modes
   - Recommendation: Benchmark for your specific use case if performance critical

3. **Schema complexity limits**
   - What we know: OpenAI strict mode has schema restrictions
   - What's unclear: Maximum schema depth/complexity for other providers
   - Recommendation: Test incrementally with your schemas, handle errors gracefully

## Sources

### Primary (HIGH confidence)
- [AI SDK Core: Generating Structured Data](https://ai-sdk.dev/docs/ai-sdk-core/generating-structured-data)
- [AI SDK Core: generateText Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/generate-text)
- [Community Providers: Writing a Custom Provider](https://ai-sdk.dev/providers/community-providers/custom-providers)
- [Troubleshooting: Tool calling with Structured Outputs](https://ai-sdk.dev/docs/troubleshooting/tool-calling-with-structured-outputs)
- [AI SDK 6 Announcement](https://vercel.com/blog/ai-sdk-6)
- [Ollama Structured Outputs Documentation](https://docs.ollama.com/capabilities/structured-outputs)

### Secondary (MEDIUM confidence)
- [ai-sdk-ollama npm package](https://www.npmjs.com/package/ai-sdk-ollama) - Provider-specific details
- [Community Providers: Ollama](https://ai-sdk.dev/providers/community-providers/ollama) - Integration guide
- [AI SDK 3.4 Announcement](https://vercel.com/blog/ai-sdk-3-4) - Historical context for experimental_output

### Tertiary (LOW confidence)
- GitHub discussions and issues - Real-world usage patterns and edge cases
- Third-party tutorials - Additional examples and use cases

## Metadata

**Confidence breakdown:**
- How Output.object works: HIGH - Verified with official documentation
- Provider requirements: HIGH - Documented in custom provider guide and confirmed in provider implementations
- JSON vs Tool modes: HIGH - Explicitly documented and confirmed in GitHub discussions
- Provider-specific details: MEDIUM - Based on official provider docs but some details inferred from community usage

**Research date:** 2026-01-24
**Valid until:** ~30 days (SDK is stable, but new providers/features may be added)

## Key Takeaways for Implementation

1. **Use `generateText` with `Output.object()`**, not deprecated `generateObject()`
2. **Providers choose mode** via `defaultObjectGenerationMode`: 'json' (native), 'tool' (wraps as tool), or undefined (unsupported)
3. **Combining tools + output requires step management** - structured output counts as a step
4. **Schema validation is automatic** - SDK validates and throws `AI_NoObjectGeneratedError` on failure
5. **Provider capabilities vary** - OpenAI has strict mode, Ollama has JSON repair, some can't mix tools + JSON
6. **Add descriptions to schema properties** for better LLM accuracy
7. **Handle errors gracefully** - not all models support structured output
