/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

const utils = require('./utils');

const isGraphQLTag = utils.isGraphQLTag;
const getGraphQLAST = utils.getGraphQLAST;

function getGraphQLFieldNames(graphQLAst) {
  const fieldNames = {};

  function walkAST(node, ignoreLevel) {
    if (node.kind === 'Field' && !ignoreLevel) {
      const fieldName = (node.alias || node.name).value;
      fieldNames[fieldName] = true;
    }
    if (node.kind === 'OperationDefinition') {
      if (node.operation === 'mutation' || node.operation === 'subscription') {
        return;
      }
      // Ignore fields that are direct children of query as used in mutation
      // or query definitions.
      node.selectionSet.selections.forEach(selection => {
        walkAST(selection, true);
      });
      return;
    }
    for (const prop in node) {
      const value = node[prop];
      if (prop === 'loc') {
        continue;
      }
      if (value && typeof value === 'object') {
        walkAST(value);
      } else if (Array.isArray(value)) {
        value.forEach(child => {
          walkAST(child);
        });
      }
    }
  }

  walkAST(graphQLAst);
  return Object.keys(fieldNames);
}

function getGraphQLString(templateLiteral) {
  return templateLiteral.quasi.quasis[0].value.cooked;
}

function isGraphQLTemplate(node) {
  return (
    node.tag.type === 'Identifier' &&
    node.tag.name === 'graphql' &&
    node.quasi.quasis.length === 1
  );
}

function isStringNode(node) {
  return (
    node != null && node.type === 'Literal' && typeof node.value === 'string'
  );
}

function isPageInfoField(field) {
  switch (field) {
    case 'page_info':
    case 'has_next_page':
    case 'has_previous_page':
    case 'start_cursor':
    case 'end_cursor':
      return true;
    default:
      return false;
  }
}

function rule(context) {
  let currentMethod = [];
  let foundMemberAccesses = {};
  let templateLiterals = [];

  function visitGetByPathCall(node) {
    // The `getByPath` utility accesses nested fields in the form
    // `getByPath(thing, ['field', 'nestedField'])`.
    const pathArg = node.arguments[1];
    if (!pathArg || pathArg.type !== 'ArrayExpression') {
      return;
    }
    pathArg.elements.forEach(element => {
      if (isStringNode(element)) {
        foundMemberAccesses[element.value] = true;
      }
    });
  }

  function visitDotAccessCall(node) {
    // The `dotAccess` utility accesses nested fields in the form
    // `dotAccess(thing, 'field.nestedField')`.
    const pathArg = node.arguments[1];
    if (isStringNode(pathArg)) {
      pathArg.value.split('.').forEach(element => {
        foundMemberAccesses[element] = true;
      });
    }
  }

  function visitMemberExpression(node) {
    if (node.property.type === 'Identifier') {
      foundMemberAccesses[node.property.name] = true;
    }
  }

  return {
    Program(node) {
      currentMethod = [];
      foundMemberAccesses = {};
      templateLiterals = [];
    },
    'Program:exit'(node) {
      templateLiterals.forEach(templateLiteral => {
        const graphQLAst = getGraphQLAST(templateLiteral);

        const queriedFields = getGraphQLFieldNames(graphQLAst);
        const unusedFields = queriedFields.filter(
          field => !foundMemberAccesses[field] && !isPageInfoField(field)
        );
        if (unusedFields.length === 0) {
          return;
        }
        const whatsUnused =
          unusedFields.length === 1
            ? 'field `' + unusedFields[0] + '`'
            : 'fields `' + unusedFields.join('`, `') + '`';
        context.report(
          templateLiteral,
          'It looks like this queries for the ' +
            whatsUnused +
            ' but this ' +
            'file is not using it directly. If a different file needs this ' +
            'information that file should export a fragment and colocate the ' +
            'query for the data with the usage.'
        );
      });
    },
    CallExpression(node) {
      if (node.callee.type !== 'Identifier') {
        return;
      }
      switch (node.callee.name) {
        case 'getByPath':
          visitGetByPathCall(node);
          break;
        case 'dotAccess':
          visitDotAccessCall(node);
          break;
      }
    },
    TaggedTemplateExpression(node) {
      if (currentMethod[0] === 'getConfigs') {
        return;
      }
      if (isGraphQLTemplate(node)) {
        templateLiterals.push(node);
      }
    },
    MemberExpression: visitMemberExpression,
    OptionalMemberExpression: visitMemberExpression,
    ObjectPattern(node) {
      node.properties
        .filter(node => node.type === 'Property')
        .filter(node => !node.computed)
        .forEach(node => {
          foundMemberAccesses[node.key.name] = true;
        });
    },
    MethodDefinition(node) {
      currentMethod.unshift(node.key.name);
    },
    'MethodDefinition:exit'(node) {
      currentMethod.shift();
    }
  };
}

module.exports = rule;