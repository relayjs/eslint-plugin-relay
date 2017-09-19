/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

function getGraphQLTagName(tag) {
  if (tag.type === 'Identifier' && tag.name === 'graphql') {
    return 'graphql';
  } else if (
    tag.type === 'MemberExpression' &&
    tag.object.type === 'Identifier' &&
    tag.object.name === 'graphql' &&
    tag.property.type === 'Identifier' &&
    tag.property.name === 'experimental'
  ) {
    return 'graphql.experimental';
  } else {
    return null;
  }
}

/**
 * Returns a loc object for error reporting.
 */
function getLoc(context, templateNode, graphQLNode) {
  const startAndEnd = getRange(context, templateNode, graphQLNode);
  const start = startAndEnd[0];
  const end = startAndEnd[1];
  return {
    start: getLocFromIndex(context.getSourceCode(), start),
    end: getLocFromIndex(context.getSourceCode(), end)
  };
}

// TODO remove after we no longer have to support ESLint 3.5.0
function getLocFromIndex(sourceCode, index) {
  if (sourceCode.getSourceCode) {
    return sourceCode.getSourceCode(index);
  }
  let pos = 0;
  for (let line = 0; line < sourceCode.lines.length; line++) {
    const lineLength = sourceCode.lines[line].length;
    if (index <= pos + lineLength) {
      return {line: line + 1, column: index - pos};
    }
    pos += lineLength + 1;
  }
  return null;
}

/**
 * Returns a range object for auto fixers.
 */
function getRange(context, templateNode, graphQLNode) {
  const graphQLStart = templateNode.quasi.quasis[0].start;
  return [
    graphQLStart + graphQLNode.loc.start,
    graphQLStart + graphQLNode.loc.end
  ];
}

function shouldLint(context) {
  return /graphql|relay/i.test(context.getSourceCode().text);
}

module.exports = {
  getGraphQLTagName: getGraphQLTagName,
  getLoc: getLoc,
  getLocFromIndex: getLocFromIndex,
  getRange: getRange,
  shouldLint: shouldLint
};
