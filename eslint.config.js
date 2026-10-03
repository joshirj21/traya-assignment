

import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jestPlugin from 'eslint-plugin-jest';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactNative from 'eslint-plugin-react-native';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(

  {
    ignores: [
      '**/node_modules/**',
      '**/android/**',
      '**/ios/**',
      '**/build/**',
      '**/dist/**',
      '**/coverage/**',
      '**/.expo/**',
      '**/.metro/**',
      '**/.cache/**',
    ],
  },

  {
    files: ['**/*.{js,jsx,ts,tsx}'],

    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],

    languageOptions: {
      parser: tseslint.parser,

      parserOptions: {
        projectService: true,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },

      globals: {
        __DEV__: 'readonly',
        console: 'readonly',
      },
    },

    settings: {
      react: {
        version: 'detect',
      },

      'import/resolver': {
        typescript: true,
      },
    },

    plugins: {
      '@typescript-eslint': tseslint.plugin,
      react,
      'react-hooks': reactHooks,
      'react-native': reactNative,
      import: importPlugin,
    },

    rules: {

      '@typescript-eslint/no-explicit-any': 'warn',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      '@typescript-eslint/no-non-null-assertion': 'warn',

      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'separate-type-imports',
        },
      ],

      '@typescript-eslint/no-floating-promises': 'error',

      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            arguments: false,
            attributes: false,
          },
        },
      ],

      '@typescript-eslint/await-thenable': 'error',

      '@typescript-eslint/no-unnecessary-condition': 'warn',

      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',

      '@typescript-eslint/no-unnecessary-type-parameters': 'warn',

      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      '@typescript-eslint/prefer-optional-chain': 'error',

      '@typescript-eslint/require-await': 'error',

      '@typescript-eslint/no-confusing-void-expression': 'error',

      'react/jsx-uses-react': 'off',

      'react/react-in-jsx-scope': 'off',

      'react/prop-types': 'off',

      'react/jsx-no-useless-fragment': 'warn',

      'react/no-array-index-key': 'warn',

      'react/no-danger': 'error',

      'react/no-deprecated': 'warn',

      'react/no-direct-mutation-state': 'error',

      'react/no-unstable-nested-components': 'warn',

      'react/self-closing-comp': 'error',

      'react-hooks/rules-of-hooks': 'error',

      'react-hooks/exhaustive-deps': 'warn',

      'react-native/no-color-literals': 'warn',

      'react-native/no-inline-styles': 'warn',

      'react-native/no-raw-text': 'off',

      'react-native/no-single-element-style-arrays': 'error',

      'import/no-duplicates': 'error',

      'import/no-named-as-default': 'error',

      'import/no-named-as-default-member': 'error',

      'import/no-unresolved': 'off',

      'import/first': 'error',

      'import/newline-after-import': 'error',

      'import/no-absolute-path': 'error',

      'import/no-self-import': 'error',

      'no-console': [
        'warn',
        {
          allow: ['warn', 'error'],
        },
      ],

      'no-debugger': 'error',

      'no-alert': 'error',

      'no-var': 'error',

      'prefer-const': 'error',

      'object-shorthand': 'error',

      'prefer-template': 'warn',

      'no-duplicate-imports': 'error',

      eqeqeq: ['error', 'always'],

      curly: ['error', 'multi-line'],

      'no-unreachable': 'error',

      'no-constant-condition': 'warn',

      'no-self-compare': 'error',

      'no-throw-literal': 'error',

      'no-return-await': 'error',

      complexity: [
        'warn',
        {
          max: 12,
        },
      ],

      'max-depth': [
        'warn',
        {
          max: 4,
        },
      ],

      'max-nested-callbacks': [
        'warn',
        {
          max: 4,
        },
      ],
    },
  },

  {
    files: [
      '**/*.test.{js,jsx,ts,tsx}',
      '**/*.spec.{js,jsx,ts,tsx}',
      '**/__tests__/**/*.{js,jsx,ts,tsx}',
    ],

    extends: [jestPlugin.configs['flat/recommended']],

    rules: {
      '@typescript-eslint/no-explicit-any': 'off',

      'no-console': 'off',

      complexity: 'off',

      'max-depth': 'off',

      'max-nested-callbacks': 'off',

      'react-native/no-inline-styles': 'off',
    },
  },

  eslintConfigPrettier,
);
