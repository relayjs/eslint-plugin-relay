/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

module.exports = {
  rules: {
    'graphql-syntax': require('./src/rule-graphql-syntax'),
    'graphql-naming': require('./src/rule-graphql-naming'),
    'generated-typescript-types': require('./src/rule-generated-typescript-types'),
    'no-future-added-value': require('./src/rule-no-future-added-value'),
    'unused-fields': require('./src/rule-unused-fields'),
    'must-colocate-fragment-spreads': require('./src/rule-must-colocate-fragment-spreads'),
    'function-required-argument': require('./src/rule-function-required-argument'),
    'hook-required-argument': require('./src/rule-hook-required-argument')
  },
  configs: {
    recommended: {
      rules: {
        'relay/graphql-syntax': 'error',
        'relay/graphql-naming': 'error',
        'relay/no-future-added-value': 'warn',
        'relay/unused-fields': 'warn',
        'relay/must-colocate-fragment-spreads': 'warn',
        'relay/function-required-argument': 'warn',
        'relay/hook-required-argument': 'warn'
      }
    },
    'ts-recommended': {
      rules: {
        'relay/graphql-syntax': 'error',
        'relay/graphql-naming': 'error',
        'relay/generated-typescript-types': 'warn',
        'relay/no-future-added-value': 'warn',
        'relay/unused-fields': 'warn',
        'relay/must-colocate-fragment-spreads': 'warn',
        'relay/function-required-argument': 'warn',
        'relay/hook-required-argument': 'warn'
      }
    },
    strict: {
      rules: {
        'relay/graphql-syntax': 'error',
        'relay/compat-uses-vars': 'error',
        'relay/no-future-added-value': 'error',
        'relay/unused-fields': 'error',
        'relay/must-colocate-fragment-spreads': 'error',
        'relay/function-required-argument': 'error',
        'relay/hook-required-argument': 'error'
      }
    },
    'ts-strict': {
      rules: {
        'relay/graphql-syntax': 'error',
        'relay/graphql-naming': 'error',
        'relay/generated-typescript-types': 'error',
        'relay/no-future-added-value': 'error',
        'relay/unused-fields': 'error',
        'relay/must-colocate-fragment-spreads': 'error',
        'relay/function-required-argument': 'error',
        'relay/hook-required-argument': 'error'
      }
    }
  }
};
