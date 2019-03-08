/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

const path = require('path');

const utils = require('./utils');
const getLoc = utils.getLoc;
const isGraphQLTag = utils.isGraphQLTag;
const shouldLint = utils.shouldLint;

const graphql = require('graphql');
const parse = graphql.parse;
const Source = graphql.Source;

module.exports = {
  meta: {
    docs: {
      description: 'Validates the syntax of graphql`...` templates.'
    }
  },
  create(context) {
    if (!shouldLint(context)) {
      return {};
    }
    return {
      TaggedTemplateExpression(node) {
        if (!isGraphQLTag(node.tag)) {
          return;
        }
        const quasi = node.quasi.quasis[0];
        if (node.quasi.quasis.length !== 1) {
          context.report({
            node: node,
            message:
              'graphql tagged templates do not support ${...} substitutions.'
          });
          return;
        }
        try {
          const filename = path.basename(context.getFilename());
          const ast = parse(new Source(quasi.value.cooked, filename));
          if (ast.definitions.length !== 1) {
            context.report({
              node: node,
              message:
                'graphql tagged templates can only contain a single definition.'
            });
          } else if (!ast.definitions[0].name) {
            context.report({
              message: 'Operations in graphql tags require a name.',
              loc: getLoc(context, node, ast.definitions[0])
            });
          }
        } catch (error) {
          context.report({
            node: node,
            message: '{{message}}',
            data: {message: error.message}
          });
        }
      }
    };
  }
};
