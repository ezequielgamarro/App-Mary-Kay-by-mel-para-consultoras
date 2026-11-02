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
            // Capas internas de cada feature: ui -> application -> data -> domain.
            {
              target: './src/features/*/domain',
              from: [
                './src/features/*/data',
                './src/features/*/application',
                './src/features/*/ui',
              ],
              message: 'domain es la capa base de la feature: no importa data, application ni ui.',
            },
            {
              target: './src/features/*/data',
              from: ['./src/features/*/application', './src/features/*/ui'],
              message: 'data no puede depender de application ni de ui.',
            },
            {
              target: './src/features/*/application',
              from: './src/features/*/ui',
              message: 'application no puede depender de ui.',
            },
            {
              target: ['./src/features/*/application', './src/features/*/ui'],
              from: './src/core/supabase',
              message: 'Solo la capa data habla con Supabase: pasá por un repositorio.',
            },
          ],
        },
      ],
    },
  },
]);
