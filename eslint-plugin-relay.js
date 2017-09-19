/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

module.exports.rules = {
  'graphql-syntax': require('./src/rule-graphql-syntax'),
  'compat-uses-vars': require('./src/rule-compat-uses-vars'),
  'graphql-naming': require('./src/rule-graphql-naming'),
  'generated-flow-types': require('./src/rule-generated-flow-types')
};
