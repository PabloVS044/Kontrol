import { defineConfig } from 'vitest/config'

// A separate, required privacy gate: real PostgreSQL + Mongo replica set,
// together with targeted unit suites. A missing database FAILS (never skips).
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
    globalSetup: ['tests/privacy/globalSetup.js'],
    setupFiles: ['tests/privacy/env.js'],
    include: [
      'tests/privacy/**/*.test.js',
      'tests/privacyExportController.test.js',
      'tests/privacyDeletionController.test.js',
      'tests/privacyAuthorization.test.js',
      'tests/accountDeletionOutbox.test.js',
      'tests/accountMongoWrite.test.js',
      'tests/companyDataExport.test.js',
      'tests/companyClosure.test.js',
      'tests/companyClosureController.test.js',
      'tests/rateLimit.test.js',
      'tests/requireAuth.test.js',
    ],
    reporters: ['default', 'json', 'junit'],
    outputFile: { json: 'reports/privacy-results.json', junit: 'reports/privacy-junit.xml' },
    coverage: {
      enabled: true,
      provider: 'v8',
      reportsDirectory: 'coverage/privacy',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/controllers/privacyController.js',
        'src/services/companyDataExport.js',
        'src/services/companyClosure.js',
        'src/controllers/companyClosureController.js',
        'src/auth/reauthentication.js',
        'src/services/mongoAccountCleanup.js',
        'src/services/accountDeletionOutbox.js',
        'src/services/accountMongoWrite.js',
        'src/services/agentPersistence.js',
        'src/services/chatPersistence.js',
      ],
      thresholds: { perFile: true, statements: 70, branches: 70, functions: 70, lines: 70 },
    },
  },
})
