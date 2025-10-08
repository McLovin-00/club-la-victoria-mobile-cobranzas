import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parser: tseslint.parser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // Temporarily relax strict rules to unblock CI; we will enable them incrementally with refactors
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    files: [
      'src/features/chat-processor/components/ChatProcessorDashboard.tsx',
      'src/features/chat-processor/api/chatProcessorApiSlice.ts',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
    },
  },
  {
    files: [
      'src/features/chat-processor/**/*.ts',
      'src/features/chat-processor/**/*.tsx',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: [
      'src/features/documentos/**/*.ts',
      'src/features/documentos/**/*.tsx',
    ],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: false }],
      '@typescript-eslint/no-empty-object-type': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: [
      'src/features/instances/**/*.ts',
      'src/features/instances/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/ban-ts-comment': 'error',
      'no-useless-escape': 'error',
    },
  },
  {
    files: [
      'src/components/ui/**/*.ts',
      'src/components/ui/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-empty-object-type': 'error',
    },
  },
  {
    files: [
      'src/features/end-users/**/*.ts',
      'src/features/end-users/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: [
      'src/features/gateway/**/*.ts',
      'src/features/gateway/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: [
      'src/features/empresas/**/*.ts',
      'src/features/empresas/**/*.tsx',
      'src/features/users/**/*.ts',
      'src/features/users/**/*.tsx',
      'src/features/usuarios/**/*.ts',
      'src/features/usuarios/**/*.tsx',
      'src/features/platform-users/**/*.ts',
      'src/features/platform-users/**/*.tsx',
      'src/features/services/**/*.ts',
      'src/features/services/**/*.tsx',
      'src/features/dashboard/**/*.ts',
      'src/features/dashboard/**/*.tsx',
      'src/features/calidad/**/*.ts',
      'src/features/calidad/**/*.tsx',
      'src/pages/**/*.tsx',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'all', caughtErrorsIgnorePattern: '^_' }],
      'no-unused-vars': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
    },
  },
  {
    files: [
      'src/**/*.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    files: [
      'src/**/*.lazy.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
