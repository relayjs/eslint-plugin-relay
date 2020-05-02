/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const utils = require('./utils');

const getGraphQLAST = utils.getGraphQLAST;

function getGraphQLFragmentNames(graphQLAst) {
  const fragmentNames = {};

  function walkAST(node) {
    if (node.kind === 'FragmentSpread') {
      const nameNode = node.name;
      fragmentNames[nameNode.value] = nameNode;
    }
    if (node.kind === 'OperationDefinition') {
      if (node.operation === 'mutation' || node.operation === 'subscription') {
        return;
      }
      node.selectionSet.selections.forEach(selection => {
        walkAST(selection);
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
  return fragmentNames;
}

function getGraphQLFragmentDefinitionName(graphQLAst) {
  const fragmentDefinition = graphQLAst.definitions.find(
    definition => definition.kind === 'FragmentDefinition'
  );
  if (fragmentDefinition) {
    return fragmentDefinition.name.value;
  } else {
    return null;
  }
}

function isGraphQLTemplate(node) {
  return (
    node.tag.type === 'Identifier' &&
    node.tag.name === 'graphql' &&
    node.quasi.quasis.length === 1
  );
}

function rule(context) {
  let foundImportedModules = [];
  let templateLiterals = [];

  return {
    Program(_node) {
      foundImportedModules = [];
      templateLiterals = [];
    },
    'Program:exit'(_node) {
      const fragmentsInTheSameModule = [];
      templateLiterals.forEach(templateLiteral => {
        const graphQLAst = getGraphQLAST(templateLiteral);
        if (!graphQLAst) {
          // ignore nodes with syntax errors, they're handled by rule-graphql-syntax
          return;
        }
        const fragmentName = getGraphQLFragmentDefinitionName(graphQLAst);
        if (fragmentName) {
          fragmentsInTheSameModule.push(fragmentName);
        }
      });

      templateLiterals.forEach(templateLiteral => {
        const graphQLAst = getGraphQLAST(templateLiteral);
        if (!graphQLAst) {
          // ignore nodes with syntax errors, they're handled by rule-graphql-syntax
          return;
        }

        const queriedFragments = getGraphQLFragmentNames(graphQLAst);
        for (const fragment in queriedFragments) {
          const matchedModuleName = foundImportedModules.find(name =>
            fragment.startsWith(name)
          );
          if (
            !matchedModuleName &&
            !fragmentsInTheSameModule.includes(fragment)
          ) {
            context.report({
              node: templateLiteral,
              loc: utils.getLoc(
                context,
                templateLiteral,
                queriedFragments[fragment]
              ),
              message:
                `This queries for the fragment \`${fragment}\` but this file does ` +
                'not seem to use it directly. If a different file needs this ' +
                'information that file should export a fragment and colocate ' +
                'the query for the data with the usage.\n'
            });
          }
        }
      });
    },
    ImportDeclaration(node) {
      foundImportedModules.push(utils.getModuleName(node.source.value));
    },
    TaggedTemplateExpression(node) {
      if (isGraphQLTemplate(node)) {
        templateLiterals.push(node);
      }
    }
  };
}

module.exports = rule;
