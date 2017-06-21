/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

const {parse, visit, Source} = require('graphql');
const path = require('path');

function shouldLint(context) {
  return /graphql|relay/i.test(context.getSourceCode().text);
}

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

function getGraphQLAST(taggedTemplateExpression) {
  if (!getGraphQLTagName(taggedTemplateExpression.tag)) {
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

// Copied directly from Relay
function getModuleName(filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  // /path/to/button/index.js -> button
  let moduleName = filename === 'index'
    ? path.basename(path.dirname(filePath))
    : filename;

  // Example.ios -> Example
  // Example.product.android -> Example
  moduleName = moduleName.replace(/(?:\.\w+)+/, '');

  // foo-bar -> fooBar
  // Relay compatibility mode splits on _, so we can't use that here.
  moduleName = moduleName.replace(/[^a-zA-Z0-9]+(\w?)/g, (match, next) =>
    next.toUpperCase(),
  );

  return moduleName;
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
 * Returns a loc object for error reporting.
 */
function getLoc(context, templateNode, graphQLNode) {
  const [start, end] = getRange(context, templateNode, graphQLNode);
  return {
    start: getLocFromIndex(context.getSourceCode(), start),
    end: getLocFromIndex(context.getSourceCode(), end),
  };
}

/**
 * Returns a range object for auto fixers.
 */
function getRange(context, templateNode, graphQLNode) {
  const graphQLStart = templateNode.quasi.quasis[0].start;
  return [
    graphQLStart + graphQLNode.loc.start,
    graphQLStart + graphQLNode.loc.end,
  ];
}

const CREATE_CONTAINER_FUNCTIONS = new Set([
  'createFragmentContainer',
  'createPaginationContainer',
  'createRefetchContainer',
]);

function isCreateContainerCall(node) {
  const callee = node.callee;
  // prettier-ignore
  return (
    callee.type === 'Identifier' &&
    CREATE_CONTAINER_FUNCTIONS.has(callee.name)
  ) || (
    callee.kind === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    // Relay, relay, RelayCompat, etc.
    /relay/i.test(callee.object.value) &&
    callee.property.type === 'Identifier' &&
    CREATE_CONTAINER_FUNCTIONS.has(callee.property.name)
  );
}

function calleeToString(callee) {
  if (callee.type) {
    return callee.name;
  }
  if (
    callee.kind === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  ) {
    return callee.object.value + '.' + callee.property.name;
  }
  return null;
}

function validateTemplate(context, taggedTemplateExpression, keyName) {
  const ast = getGraphQLAST(taggedTemplateExpression);
  if (!ast) {
    return;
  }
  const moduleName = getModuleName(context.getFilename());
  ast.definitions.forEach(def => {
    if (!def.name) {
      // no name, covered by graphql-naming/TaggedTemplateExpression
      return;
    }
    const definitionName = def.name.value;
    if (def.kind === 'FragmentDefinition') {
      if (keyName) {
        const expectedName = moduleName + '_' + keyName;
        if (definitionName !== expectedName) {
          context.report({
            loc: getLoc(context, taggedTemplateExpression, def.name),
            message:
              'Container fragment names must be `<ModuleName>_<propName>`. ' +
                'Got `{{actual}}`, expected `{{expected}}`.',
            data: {
              actual: definitionName,
              expected: expectedName,
            },
            fix: fixer =>
              fixer.replaceTextRange(
                getRange(context, taggedTemplateExpression, def.name),
                expectedName
              ),
          });
        }
      }
    }
  });
}

module.exports.rules = {
  'graphql-syntax': {
    meta: {
      docs: {
        description:
          'Validates the syntax of all graphql`...` and ' +
            'graphql.experimental`...` templates.',
      },
    },
    create(context) {
      if (!shouldLint(context)) {
        return {};
      }
      return {
        TaggedTemplateExpression(node) {
          if (!getGraphQLTagName(node.tag)) {
            return;
          }
          const quasi = node.quasi.quasis[0];
          if (node.quasi.quasis.length !== 1) {
            context.report({
              node: node,
              message:
                'graphql tagged templates do not support ${...} substitutions.',
            });
            return;
          }
          try {
            const filename = path.basename(context.getFilename());
            const ast = parse(new Source(quasi.value.cooked, filename));
            ast.definitions.forEach(definition => {
              if (!definition.name) {
                context.report({
                  message: 'Operations in graphql tags require a name.',
                  loc: getLoc(context, node, definition),
                });
              }
            });
          } catch (error) {
            context.report({
              node: node,
              message: '{{message}}',
              data: {message: error.message},
            });
          }
        },
      };
    },
  },
  'compat-uses-vars': {
    meta: {
      docs: {
        description:
          'Relay Compat transforms fragment spreads from ' +
            "`...Container_foo` to `Container.getFragment('foo')`. This " +
            'makes ESLint aware of this.',
      },
    },
    create(context) {
      if (!shouldLint(context)) {
        return {};
      }
      if (
        !/react-relay\/compat|RelayCompat/.test(context.getSourceCode().text)
      ) {
        // Only run in for compat mode files
        return {};
      }
      function isInScope(name) {
        var scope = context.getScope();
        var sourceCode = context.getSourceCode();
        var variables = scope.variables;

        while (scope.type !== 'global') {
          scope = scope.upper;
          variables = scope.variables.concat(variables);
        }
        if (scope.childScopes.length) {
          variables = scope.childScopes[0].variables.concat(variables);
          // Temporary fix for babel-eslint
          if (scope.childScopes[0].childScopes.length) {
            variables = scope.childScopes[0].childScopes[0].variables.concat(
              variables
            );
          }
        }

        for (var i = 0, len = variables.length; i < len; i++) {
          if (variables[i].name === name) {
            return true;
          }
        }
        return false;
      }

      return {
        TaggedTemplateExpression(taggedTemplateExpression) {
          const ast = getGraphQLAST(taggedTemplateExpression);
          if (!ast) {
            return;
          }
          visit(ast, {
            FragmentSpread(spreadNode) {
              const m =
                spreadNode.name &&
                spreadNode.name.value.match(/^([a-z0-9]+)_/i);
              if (!m) {
                return;
              }
              const componentName = m[1];
              if (isInScope(componentName)) {
                // if this variable is defined, mark it as used
                context.markVariableAsUsed(componentName);
              } else {
                // otherwise, yell about this needed to be defined
                context.report({
                  message:
                    'In compat mode, Relay expects the component that has ' +
                      'the `{{fragmentName}}` fragment to be imported with ' +
                      'the variable name `{{varName}}`.',
                  data: {
                    fragmentName: spreadNode.name.value,
                    varName: componentName,
                  },
                  loc: getLoc(
                    context,
                    taggedTemplateExpression,
                    spreadNode.name
                  ),
                });
              }
            },
          });
        },
      };
    },
  },
  'graphql-naming': {
    meta: {
      fixable: 'code',
      docs: {
        description: 'Validates naming conventions of graphql tags',
      },
    },
    create(context) {
      if (!shouldLint(context)) {
        return {};
      }
      return {
        TaggedTemplateExpression(node) {
          const ast = getGraphQLAST(node);
          if (!ast) {
            return;
          }

          ast.definitions.forEach(definition => {
            switch (definition.kind) {
              case 'OperationDefinition':
                const moduleName = getModuleName(context.getFilename());
                const name = definition.name;
                if (!name) {
                  return;
                }
                const operationName = name.value;

                if (operationName.indexOf(moduleName) !== 0) {
                  context.report({
                    message:
                      'Operations should start with the module name. ' +
                        'Expected prefix `{{expected}}`, got `{{actual}}`.',
                    data: {
                      expected: moduleName,
                      actual: operationName,
                    },
                    loc: getLoc(context, node, name),
                  });
                }
                break;
              default:
            }
          });
        },
        CallExpression(node) {
          if (!isCreateContainerCall(node)) {
            return;
          }
          const fragments = node.arguments[1];
          if (fragments.type === 'ObjectExpression') {
            fragments.properties.forEach(property => {
              if (
                property.type === 'Property' &&
                property.key.type === 'Identifier' &&
                property.computed === false &&
                property.value.type === 'TaggedTemplateExpression'
              ) {
                const tagName = getGraphQLTagName(property.value.tag);

                if (!tagName) {
                  context.report({
                    node: property.value.tag,
                    message:
                      '`{{callee}}` expects GraphQL to be tagged with ' +
                        'graphql`...` or graphql.experimental`...`.',
                    data: {
                      callee: calleeToString(node.callee),
                    },
                  });
                  return;
                }
                validateTemplate(context, property.value, property.key.name);
              } else {
                context.report({
                  node: property,
                  message:
                    '`{{callee}}` expects fragment definitions to be ' +
                      '`key: graphql`.',
                  data: {
                    callee: calleeToString(node.callee),
                  },
                });
              }
            });
          }
        },
      };
    },
  },
};
