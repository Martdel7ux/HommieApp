// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'supabase/*', 'admin-web/*', 'admin-web/**'],
  },
  {
    rules: {
      'import/no-unresolved': 'off',
    },
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: { require: 'readonly', module: 'readonly', process: 'readonly', Buffer: 'readonly', console: 'readonly' },
    },
  },
  {
    files: ['jest.config.js', 'jest.setup.js', '**/__tests__/**', '**/*.test.{js,ts,tsx}'],
    languageOptions: {
      globals: {
        jest: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
      },
    },
  },
]);
