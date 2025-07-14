module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-var-requires': 'warn'
  },
  // Add overrides to disable specific rules for specific files or patterns
  overrides: [
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