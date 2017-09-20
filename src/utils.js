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

const graphql = require('graphql');
const parse = graphql.parse;

function getGraphQLAST(taggedTemplateExpression) {
  if (!isGraphQLTag(taggedTemplateExpression.tag)) {
    return null;
  }
  if (taggedTemplateExpression.quasi.quasis.length !== 1) {
    // has substitutions, covered by graphql-syntax rule
    return null;
  }
  const quasi = taggedTemplateExpression.quasi.quasis[0];
  try {
    return parse(quasi.value.cooked);
  } catch (error) {
    // Invalid syntax, covered by graphql-syntax rule
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

// Copied directly from Relay
function getModuleName(filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  // /path/to/button/index.js -> button
  let moduleName =
    filename === 'index' ? path.basename(path.dirname(filePath)) : filename;

  // Example.ios -> Example
  // Example.product.android -> Example
  moduleName = moduleName.replace(/(?:\.\w+)+/, '');

  // foo-bar -> fooBar
  // Relay compatibility mode splits on _, so we can't use that here.
  moduleName = moduleName.replace(/[^a-zA-Z0-9]+(\w?)/g, (match, next) =>
    next.toUpperCase()
  );

  return moduleName;
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

function isGraphQLTag(tag) {
  return tag.type === 'Identifier' && tag.name === 'graphql';
}

function shouldLint(context) {
  return /graphql|relay/i.test(context.getSourceCode().text);
}

module.exports = {
  getGraphQLAST: getGraphQLAST,
  getLoc: getLoc,
  getLocFromIndex: getLocFromIndex,
  getModuleName: getModuleName,
  getRange: getRange,
  isGraphQLTag: isGraphQLTag,
  shouldLint: shouldLint
};
