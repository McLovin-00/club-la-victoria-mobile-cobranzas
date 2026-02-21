import js from '@eslint/js';
import globals from 'globals';
import { configs as tsConfigs } from 'typescript-eslint';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**', '.prisma/**'] },
  js.configs.recommended,
  ...tsConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'warn',
    },
  }
];
