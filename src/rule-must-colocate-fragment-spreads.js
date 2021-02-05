/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * This rule lints for non-colocated fragment spreads within queries or
 * fragments. In other words, situations where a fragment is spread in module A,
 * but the module (B) that defines that fragment is not imported by module A.
 * It does not lint subscriptions or mutations. This catches:
 *
 * - The anti-pattern of spreading a fragment in a parent module, then passing
 * that data down to a child module, or jamming it all in context. This defeats
 * the purpose of Relay. From the
 * [Relay docs](https://relay.dev/docs/en/next/introduction-to-relay) – "[Relay]
 * allows components to specify what data they need and the Relay framework
 * provides the data. This makes the data needs of inner components opaque and
 * allows composition of those needs."
 * - Instances where fragment spreads are unused, which results in overfetching.
 *
 * ## When the fragment is unused
 * The easiest way to tell if a fragment is unused is to remove the line
 * containing the lint error, run Relay compiler, then Flow. If there are no
 * type errors, then the fragment was possibly unused. You should still test
 * your functionality to see that it's working as expected.
 *
 * ## When the fragment is being passed to a child component
 * If you received Relay or Flow errors after attempting to remove the fragment,
 * then it's very likely that you're passing that data down the tree. Our
 * recommendation is to have components specify the data they need. In the below
 * example, this is an anti-pattern because Component B's data requirements are
 * no longer opaque. Component B should not be fetching data on Component C's
 * behalf.
 *
 * function ComponentA(props) {
 *   const data = useFragment(graphql`
 *     fragment ComponentA_fragment on User {
 *       foo
 *       bar
 *       some_field {
 *         ...ComponentC_fragment
 *       }
 *     }
 *   `);
 *   return (
 *     <div>
 *       {data.foo} {data.baz}
 *       <ComponentB text="Hello" data={data.some_field} />
 *     </div>
 *   );
 * }
 *
 * To address this, refactor Component C to fetch the data it needs. You'll need
 * to update the intermediate components by amending, or adding a fragment to
 * each intermediate component between ComponentA and ComponentC.
 */

'use strict';

const {visit} = require('graphql');
const utils = require('./utils');

const ESLINT_DISABLE_COMMENT =
  ' eslint-disable-next-line relay/must-colocate-fragment-spreads';

function getGraphQLFragmentSpreads(graphQLAst) {
  const fragmentSpreads = {};
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
      if (
        utils.hasPrecedingEslintDisableComment(node, ESLINT_DISABLE_COMMENT)
      ) {
        return;
      }
      fragmentSpreads[node.name.value] = node;
    }
  });
  return fragmentSpreads;
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
        const queriedFragments = getGraphQLFragmentSpreads(graphQLAst);
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
      if (node.source.type === 'Literal') {
        // Allow dynamic imports like import(`test/${fileName}`); and (path) => import(path);
        // These would have node.source.value undefined
        foundImportedModules.push(utils.getModuleName(node.source.value));
      }
    },

    CallExpression(node) {
      if (node.callee.name !== 'require') {
        return;
      }
      const [source] = node.arguments;
      if (source && source.type === 'Literal') {
        foundImportedModules.push(utils.getModuleName(source.value));
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
