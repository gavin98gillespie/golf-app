// ESLint v10 flat config. eslint-config-expo's legacy preset is consumed via
// the flat compatibility entry; prettier is layered on top to disable
// formatting-related rules and surface prettier diffs as warnings.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'warn',
    },
  },
  {
    ignores: ['node_modules', '.expo', 'dist'],
  },
];
