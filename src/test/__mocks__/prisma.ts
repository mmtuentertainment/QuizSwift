/**
 * Mock for @/lib/prisma module
 * Used by Vitest to provide mock Prisma client in tests
 */
import { vi } from 'vitest'

const prisma = {
  quiz: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  curatedQuestion: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  quizAttempt: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    upsert: vi.fn(),
  },
  questionAnswer: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  document: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((callback) => callback({
    quiz: { findUnique: vi.fn(), update: vi.fn() },
    curatedQuestion: { updateMany: vi.fn(), count: vi.fn() },
    quizAttempt: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  })),
}

export default prisma
