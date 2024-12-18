import { defineConfig } from 'vitest/config'

export default defineConfig({
  publicDir: 'public',
  server: {
    host: true
  },
  test: {
    root: __dirname,
    include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    testTimeout: 1000 * 29,
  },
})
