/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {shouldLint} = require('./utils');

function reportMissingKeyArgument(node, context) {
  context.report({
    node: node,
    message: `A fragment reference should be passed to the \`readInlineData\` function`
  });
}

module.exports = {
  meta: {
    docs: {
      description:
        'Validates that the second argument is passed to relay functions.'
    }
  },
  create(context) {
    if (!shouldLint(context)) {
      return {};
    }

    return {
      'CallExpression[callee.name=readInlineData][arguments.length < 2]'(node) {
        reportMissingKeyArgument(node, context);
      }
    };
  }
};
