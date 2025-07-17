import eslintPluginPromise from 'eslint-plugin-promise';

/** @type {import("eslint").Linter.FlatConfig} */
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        console: 'readonly',
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly'
      }
    },
    plugins: {
      promise: eslintPluginPromise
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-var': 'error',
      'prefer-const': 'warn',
      'quotes': ['warn', 'single'],
      'semi': ['warn', 'always'],
      'comma-dangle': ['warn', 'never'],
      'arrow-spacing': ['warn', { before: true, after: true }],
      'promise/always-return': 'off',
      'promise/no-nesting': 'off',
      'promise/no-promise-in-callback': 'warn',
      'promise/param-names': 'error'
    }
  }
];
