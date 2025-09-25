module.exports = {
  env: {
    browser: true,
    es2022: true,
    node: true,
    jest: true,
    webextensions: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module'
  },
  globals: {
    chrome: 'readonly',
    browser: 'readonly'
  },
  rules: {
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': ['error', 'never'],
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'never'],
    'space-before-function-paren': ['error', {
      anonymous: 'never',
      named: 'never',
      asyncArrow: 'always'
    }],
    // Chrome Extension specific rules
    'no-undef': ['error', { typeof: false }],
    // Allow console.log in development
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn'
  },
  overrides: [
    {
      files: ['tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off'
      }
    },
    {
      files: ['extension/background/**/*.js'],
      globals: {
        chrome: 'readonly',
        self: 'readonly',
        importScripts: 'readonly'
      }
    },
    {
      files: ['extension/content/**/*.js'],
      env: {
        browser: true
      },
      globals: {
        chrome: 'readonly',
        window: 'readonly',
        document: 'readonly'
      }
    }
  ]
}
