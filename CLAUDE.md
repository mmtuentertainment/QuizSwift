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
- Vercel Blob storage

## Structure

```
src/app/          # Pages + API routes
src/components/   # React components
src/lib/          # Utilities (ai, pdf, auth)
src/inngest/      # Background jobs
prisma/           # Database schema
.planning/        # GSD workflow files
```
