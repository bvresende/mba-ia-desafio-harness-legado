import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

const tsRecommendedFor = (files) =>
  tseslint.configs.recommended.map((config) => ({
    ...config,
    files,
  }))

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '.balcao-env/**',
      'kit-gates/**',
      'kit-gates-proprios/**',
      'blackbox/**',
      'specs/**',
      'scripts/**',
    ],
  },
  {
    ...js.configs.recommended,
    files: ['api/src/**/*.{ts,tsx}'],
  },
  ...tsRecommendedFor(['api/src/**/*.{ts,tsx}']),
  {
    files: ['api/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    ...js.configs.recommended,
    files: ['web/src/**/*.{ts,tsx}'],
  },
  ...tsRecommendedFor(['web/src/**/*.{ts,tsx}']),
  {
    ...reactHooks.configs.flat.recommended,
    files: ['web/src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['api/src/**/*.{ts,tsx}'],
    ignores: ['api/src/config/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: '[G5] process.env só é permitido em api/src/config/',
        },
        {
          selector: "MemberExpression[object.name='process'][property.value='env']",
          message: '[G5] process.env só é permitido em api/src/config/',
        },
      ],
    },
  },
  {
    files: ['web/src/**/*.{ts,tsx}'],
    ignores: ['web/src/config/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "MemberExpression[object.type='MetaProperty'][object.meta.name='import'][object.property.name='meta'][property.name='env']",
          message: '[G5] import.meta.env só é permitido em web/src/config/',
        },
        {
          selector:
            "MemberExpression[object.type='MetaProperty'][object.meta.name='import'][object.property.name='meta'][property.value='env']",
          message: '[G5] import.meta.env só é permitido em web/src/config/',
        },
      ],
    },
  },
  {
    files: ['web/src/pages/**/*.{ts,tsx}', 'web/src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: '[G12] Chamadas HTTP devem passar por web/src/api/',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'window',
          property: 'fetch',
          message: '[G12] Chamadas HTTP devem passar por web/src/api/',
        },
        {
          object: 'globalThis',
          property: 'fetch',
          message: '[G12] Chamadas HTTP devem passar por web/src/api/',
        },
      ],
    },
  },
]
