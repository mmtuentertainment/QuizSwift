/**
 * Mock for @/lib/auth module
 * Used by Vitest to provide mock authentication in tests
 */
import { vi } from 'vitest'

export const auth = vi.fn(() => Promise.resolve({
  user: { id: 'test-user-id', email: 'test@example.com', name: 'Test User' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}))
