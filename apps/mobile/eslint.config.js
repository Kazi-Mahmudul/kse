// Expo ESLint flat config — https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Skip react-version auto-detection, which breaks in the hoisted monorepo.
    settings: {
      react: {
        version: '19.2',
      },
    },
    ignores: ['dist/*'],
  },
]);
