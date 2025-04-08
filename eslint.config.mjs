import {defineConfig} from 'eslint/config';
import js from '@eslint/js';
import globals from 'globals';

export default defineConfig([
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node
    },
    rules: {
      'prefer-const': 'error',
      'no-unused-vars': ['error', {argsIgnorePattern: '^_', caughtErrors: 'none'}],
    }
  }
]);
