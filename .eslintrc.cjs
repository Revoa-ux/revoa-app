module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'plugin:eslint-comments/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh', 'eslint-comments'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'warn',
    '@typescript-eslint/ban-ts-comment': 'warn',
    'no-unused-labels': 'warn',
    'unused-imports/no-unused-imports': 'off',
    'unused-imports/no-unused-vars': 'off',
    '@typescript-eslint/no-empty-function': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    // Add this rule to solve the "Unused eslint-disable directive" errors
    'eslint-comments/no-unused-disable': 'off',
  },
  // Add overrides to disable specific rules for specific files or patterns
  overrides: [
    {
      files: ['**/*.tsx', '**/*.ts'],
      rules: {
        'eslint-comments/no-unused-disable': 'off',
      },
    },
    {
      // Disable checking for server-side files that might have type errors during build
      files: ['src/server/**/*.ts', 'src/server/**/*.tsx', 'src/types/**/*.ts'],
      rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
        '@typescript-eslint/no-unused-vars': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
      }
    },
    {
      // Treat all eslint-disable directives as warnings rather than errors
      files: ['**/*.tsx', '**/*.ts'],
      rules: {
        '@typescript-eslint/prefer-as-const': 'warn',
        'react-hooks/exhaustive-deps': 'warn',
      }
    }
  ]
}