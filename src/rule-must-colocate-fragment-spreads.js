/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const {visit} = require('graphql');
const utils = require('./utils');

function getGraphQLFragmentNames(graphQLAst) {
  const fragmentNames = {};
  visit(graphQLAst, {
    FragmentSpread(node, key, parent, path, ancestors) {
      for (const ancestorNode of ancestors) {
        if (ancestorNode.kind === 'OperationDefinition') {
          if (
            ancestorNode.operation === 'mutation' ||
            ancestorNode.operation === 'subscription'
          ) {
            return;
          }
        }
      }
      for (const directiveNode of node.directives) {
        if (directiveNode.name.value === 'module') {
          return;
        }
        if (directiveNode.name.value === 'relay') {
          for (const argumentNode of directiveNode.arguments) {
            if (
              argumentNode.name.value === 'mask' &&
              argumentNode.value.value === false
            ) {
              return;
            }
          }
        }
      }
      const nameNode = node.name;
      fragmentNames[nameNode.value] = nameNode;
    }
  });
  return fragmentNames;
}

function getGraphQLFragmentDefinitionName(graphQLAst) {
  let name = null;
  visit(graphQLAst, {
    FragmentDefinition(node) {
      name = node.name.value;
    }
  });
  return name;
}

function rule(context) {
  const foundImportedModules = [];
  const graphqlLiterals = [];

  return {
    'Program:exit'(_node) {
      const fragmentsInTheSameModule = [];
      graphqlLiterals.forEach(({graphQLAst}) => {
        const fragmentName = getGraphQLFragmentDefinitionName(graphQLAst);
        if (fragmentName) {
          fragmentsInTheSameModule.push(fragmentName);
        }
      });
      graphqlLiterals.forEach(({node, graphQLAst}) => {
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
              node,
              loc: utils.getLoc(context, node, queriedFragments[fragment]),
              message:
                `This spreads the fragment \`${fragment}\` but ` +
                'this module does not use it directly. If a different module ' +
                'needs this information, that module should directly define a ' +
                'fragment querying for that data, colocated next to where the ' +
                'data is used.\n'
            });
          }
        }
      });
    },

    ImportDeclaration(node) {
      if (node.importKind === 'value') {
        foundImportedModules.push(utils.getModuleName(node.source.value));
      }
    },

    ImportExpression(node) {
      foundImportedModules.push(utils.getModuleName(node.source.value));
    },

    CallExpression(node) {
      if (node.callee.name === 'require') {
        const [source] = node.arguments;
        if (source && source.type === 'Literal') {
          foundImportedModules.push(utils.getModuleName(source.value));
        }
      }
    },

    TaggedTemplateExpression(node) {
      if (utils.isGraphQLTemplate(node)) {
        const graphQLAst = utils.getGraphQLAST(node);
        if (!graphQLAst) {
          // ignore nodes with syntax errors, they're handled by rule-graphql-syntax
          return;
        }
        graphqlLiterals.push({node, graphQLAst});
      }
    }
  };
}

module.exports = rule;
