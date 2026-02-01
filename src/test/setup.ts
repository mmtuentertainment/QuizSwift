import '@testing-library/jest-dom/vitest'

// =============================================================================
// Server-Only Dependency Note
// =============================================================================
// Server action files (src/actions/*.ts) have deep server-only dependency chains:
// - @/lib/auth, @/lib/prisma, next/cache, next/navigation, @/generated/prisma/client
//
// Mocking these via vitest aliases or vi.mock() requires mocking the entire
// transitive chain. For validation-focused tests, we simulate schemas locally
// in test files instead of importing from server action modules.
//
// Mock files in ./src/test/__mocks__/ are available for future use if needed.
