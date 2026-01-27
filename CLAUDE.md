# Claude Code Guidelines

## Critical: Never Kill All Node Processes

Claude Code runs on Node. This will crash your session:
```powershell
# NEVER USE
Stop-Process -Name node -Force
```

Kill by PID or use `KillShell` tool instead.

## Servers

| Service | Port |
|---------|------|
| Next.js dev | 3000 |
| Inngest dev | 8288 |
| Prisma Studio | 5555 |

## Stack

- Next.js 16 + React 19 + TypeScript
- Prisma 7 + PostgreSQL + pgvector
- Vercel AI SDK (Ollama/OpenAI)
- Inngest background jobs
- Cloudflare R2 storage

## Structure

```text
src/app/          # Pages + API routes
src/components/   # React components
src/lib/          # Utilities (ai, pdf, auth)
src/inngest/      # Background jobs
prisma/           # Database schema
.planning/        # GSD workflow files
```

## Hard Rules

### Context Documents (CRITICAL - GSD Only)

**NEVER create context/documentation files outside GSD structure:**
- NO README.md, ARCHITECTURE.md, CONTRIBUTING.md in project root
- NO inline documentation files alongside code
- NO context summaries or notes files

**ALL context lives in `.planning/`:**
```text
.planning/
├── PROJECT.md      # What we're building
├── REQUIREMENTS.md # Checkable requirements
├── ROADMAP.md      # Phase breakdown
├── STATE.md        # Current position (read first!)
├── config.json     # GSD settings
├── codebase/       # Codebase analysis (from /gsd:map-codebase)
├── phases/         # Phase plans and summaries
└── research/       # Discovery and research docs
```

**Why:** GSD provides structured context management. Ad-hoc docs fragment context and create drift.

### GSD Workflow (CRITICAL - Token Management)

**After EVERY `/gsd:*` command completes:**
1. STOP execution immediately
2. Output the exact text: `✓ Done. Run /clear then [next-command]`
3. DO NOT continue to the next GSD command in the same context

**GSD Command Flow:**
```text
/gsd:new-project    → /clear → /gsd:plan-phase 1
/gsd:new-milestone  → /clear → /gsd:plan-phase N
/gsd:plan-phase N   → /clear → /gsd:execute-phase N
/gsd:execute-phase N → /clear → /gsd:verify-work N
/gsd:verify-work N  → /clear → /gsd:plan-phase N+1 (or complete-milestone)
```

**Why:** GSD skills inject ~500 lines into context. Without /clear, token usage compounds exponentially. Fresh context per operation is the design intent.

### Session Start Protocol

**Every session begins with:**
1. Read `.planning/STATE.md` — know current position
2. Read `.planning/PROJECT.md` — understand core value and constraints
3. Check for `.continue-here*.md` files — resume interrupted work

**STATE.md provides:**
- Current phase and plan position
- Last activity and session continuity
- Accumulated decisions and blockers
- Performance metrics

### Session End Protocol

**Before ending any session:**
1. Update `.planning/STATE.md` with:
   - Current position (phase, plan, status)
   - Last activity description
   - Any new decisions or blockers
2. If mid-task, create `.continue-here.md` with:
   - Current state
   - Completed work
   - Remaining work
   - Next action

### Continuation Format

**After completing any GSD command, output:**

```markdown
---

## ▶ Next Up

**{identifier}: {name}** — {one-line description}

`{command to copy-paste}`

<sub>`/clear` first → fresh context window</sub>

---

**Also available:**
- `{alternative option 1}` — description
- `{alternative option 2}` — description

---
```

### Checkpoint Protocol

**When executing plans with checkpoints:**

1. **checkpoint:human-verify** (90%) — Claude automates, human confirms
   - Claude starts dev server BEFORE checkpoint
   - User only visits URLs, never runs commands

2. **checkpoint:decision** (9%) — Human makes architectural choices
   - Present options with balanced pros/cons
   - Wait for selection before proceeding

3. **checkpoint:human-action** (1%) — Truly unavoidable manual steps
   - Only for things with NO CLI/API (email verification, 3DS, etc.)
   - Claude does everything automatable first

**Golden Rule:** If Claude CAN automate it, Claude MUST automate it.

### Planned But Unimplemented Features (CRITICAL)

**NEVER assume a planned feature was intentionally skipped or should be removed.**

Before removing or modifying any code/schema that references a planned but unimplemented feature:

1. **Check for skip documentation:**
   - Search `.planning/phases/*/SUMMARY.md` for explicit skip decisions
   - Check `.planning/STATE.md` blockers section
   - Look for `// TODO:`, `// SKIP:`, or similar comments with rationale

2. **Verify it wasn't missed in execution:**
   - Cross-reference PLAN.md tasks against actual implementation
   - Check if the feature exists in requirements but not in code
   - If missing without documentation, flag it as a potential execution gap

3. **When in doubt, ASK:**
   - Use AskUserQuestion to clarify before removing
   - Present: "Found [X] in plan but not implemented. Should I: (a) implement it, (b) document why skipped, (c) remove it?"

**Why:** Planned features represent user intent. Removing them silently loses context and may break expected functionality. External tools (like CodeRabbit) may flag planned-but-not-yet-implemented code as "unused" when it's actually pending implementation.

### Git Integration

**Commit planning docs:**
- `.planning/` is tracked in git (not in .gitignore)
- Commit PLAN.md and SUMMARY.md after each plan
- Use conventional commit format: `docs(XX-YY): description`

**Branch strategy:**
- Feature branches for milestones
- Atomic commits per plan completion
- STATE.md updated with each commit
