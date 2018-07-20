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

const graphql = require('graphql');
const parse = graphql.parse;
const Source = graphql.Source;

module.exports = context => {
  function validateValue(node) {
    if (node.value === '%future added value') {
      context.report(
        node,
        "Do not use `'%future added value'`. It represents any potential " +
          'value that the server might return in the future that the code ' +
          'should handle.'
      );
    }
  }
  return {
    Literal: validateValue,
    StringLiteralTypeAnnotation: validateValue
  };
};
