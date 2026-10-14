import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import prettier from 'eslint-config-prettier'

// Errors that existed when lint was introduced are frozen in
// eslint-suppressions.json: CI fails only on new ones. See CONTRIBUTING.md.
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'backend/reports/**',
      'frontend/.visual-parity/**',
      'frontend/public/**',
      'k6/**',
      'volume/**',
      'zap/**',
      'docs/**',
      'presentacion-kontrol/**',
      'scratch_script*.js',
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['frontend/**/*.{js,mjs,vue}'],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['*.{js,mjs}', 'frontend/*.{js,mjs}', 'backend/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/tests/**'],
    languageOptions: { globals: { ...globals.vitest, ...globals.node } },
  },
  {
    rules: {
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Renaming Button, Card, Navbar... touches every importer; not worth the churn.
      'vue/multi-word-component-names': 'off',
      'no-console': 'error',
    },
  },
  {
    // CLI scripts and tests write to stdout on purpose; the logger wraps console.
    files: [
      'backend/src/db/{seed,reset,verifyUxPhase2}.js',
      'backend/scripts/**',
      '**/tests/**',
      '**/utils/logger.js',
    ],
    rules: { 'no-console': 'off' },
  },
  prettier,
]
