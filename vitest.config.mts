import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Testele acopera logica de bani (webhook Stripe + checkout), ruleaza in Node,
// fara servicii reale — toate dependentele (Stripe/Supabase/log) sunt mock-uite.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
