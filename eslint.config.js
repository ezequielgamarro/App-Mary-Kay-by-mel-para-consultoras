const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*'] },
  {
    // Las dependencias van hacia adentro: features -> design-system -> core.
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/core',
              from: ['./src/design-system', './src/features'],
              message: 'core es la capa base: no puede importar design-system ni features.',
            },
            {
              target: './src/design-system',
              from: './src/features',
              message: 'design-system no puede depender de las features.',
            },
          ],
        },
      ],
    },
  },
]);
