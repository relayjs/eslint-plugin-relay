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
    'unused-fields': require('./src/rule-unused-fields')
  },
  configs: {
    recommended: {
      rules: {
        'relay/graphql-syntax': 'error',
        'relay/compat-uses-vars': 'warn',
        'relay/graphql-naming': 'error',
        'relay/generated-flow-types': 'warn',
        'relay/no-future-added-value': 'warn',
        'relay/unused-fields': 'warn'
      }
    },
    strict: {
      rules: {
        'relay/graphql-syntax': 'error',
        'relay/compat-uses-vars': 'error',
        'relay/graphql-naming': 'error',
        'relay/generated-flow-types': 'error',
        'relay/no-future-added-value': 'error',
        'relay/unused-fields': 'error'
      }
    }
  }
};
