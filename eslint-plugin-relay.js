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
    'compat-uses-vars': require('./src/rule-compat-uses-vars'),
    'graphql-naming': require('./src/rule-graphql-naming'),
    'generated-flow-types': require('./src/rule-generated-flow-types'),
    'no-future-added-value': require('./src/rule-no-future-added-value'),
    'unused-fields': require('./src/rule-unused-fields'),
    'must-colocate-fragment-spreads': require('./src/rule-must-colocate-fragment-spreads'),
    'function-required-argument': require('./src/rule-function-required-argument'),
    'hook-required-argument': require('./src/rule-hook-required-argument')
  },
  configs: {
    recommended: {
      rules: {
        '@kbjz/relay/graphql-syntax': 'error',
        '@kbjz/relay/compat-uses-vars': 'warn',
        '@kbjz/relay/graphql-naming': 'error',
        '@kbjz/relay/generated-flow-types': 'warn',
        '@kbjz/relay/no-future-added-value': 'warn',
        '@kbjz/relay/unused-fields': 'warn',
        '@kbjz/relay/must-colocate-fragment-spreads': 'warn',
        '@kbjz/relay/function-required-argument': 'warn',
        '@kbjz/relay/hook-required-argument': 'warn'
      }
    },
    strict: {
      rules: {
        '@kbjz/relay/graphql-syntax': 'error',
        '@kbjz/relay/compat-uses-vars': 'error',
        '@kbjz/relay/graphql-naming': 'error',
        '@kbjz/relay/generated-flow-types': 'error',
        '@kbjz/relay/no-future-added-value': 'error',
        '@kbjz/relay/unused-fields': 'error',
        '@kbjz/relay/must-colocate-fragment-spreads': 'error',
        '@kbjz/relay/function-required-argument': 'error',
        '@kbjz/relay/hook-required-argument': 'error'
      }
    }
  }
};
