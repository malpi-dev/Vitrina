// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  {
    // Resolve the `@/` alias through tsconfig paths (same as the editor and Metro).
    settings: { 'import/resolver': { typescript: { project: './tsconfig.json' }, node: true } },
  },
  {
    ignores: [
      'src/core/supabase/database.generated.ts',
      'dist/*',
      'supabase/functions/**',
      '.expo/**',
      'android/**',
      'ios/**',
      'coverage/**',
    ],
  },
  // Only core/supabase and features/*/data may talk to Supabase; only the payment folder to Stripe.
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: [
      'src/core/supabase/**',
      'src/features/*/data/**',
      'src/test/**',
      'src/features/checkout/presentation/payment/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/*'],
              message: 'Only src/core/supabase and features/*/data may import Supabase.',
            },
            {
              group: ['@stripe/*'],
              message: 'Only features/checkout/presentation/payment may import Stripe.',
            },
          ],
        },
      ],
    },
  },
  // data/ can talk to Supabase but never to Stripe (the PaymentSheet is a React hook).
  {
    files: ['src/features/*/data/**/*.{ts,tsx}', 'src/core/supabase/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@stripe/*'],
              message: 'Stripe is only used from features/checkout/presentation/payment.',
            },
          ],
        },
      ],
    },
  },
  // domain/ is pure. It goes last: when two blocks define the same rule for a file, the last one wins.
  {
    files: ['src/features/*/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/data/**', '**/presentation/**'],
              message: 'domain must not import data or presentation.',
            },
            {
              group: ['react', 'react-native', 'react-native-*', 'expo', 'expo-*', '@expo/*'],
              message: 'domain must be framework-free.',
            },
            {
              group: [
                '@supabase/*',
                '@stripe/*',
                '@tanstack/*',
                'zustand',
                'zustand/*',
                'nativewind',
              ],
              message: 'domain must not depend on backend/state/UI libraries.',
            },
            {
              group: ['@/core/*', '!@/core/errors', '!@/core/errors/*', '!@/core/utils/money'],
              message: 'domain may only import @/core/errors and @/core/utils/money from core.',
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
