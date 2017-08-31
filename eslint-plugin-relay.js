/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

const graphql = require('graphql');
const parse = graphql.parse;
const visit = graphql.visit;
const Source = graphql.Source;
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
  const startAndEnd = getRange(context, templateNode, graphQLNode);
  const start = startAndEnd[0];
  const end = startAndEnd[1];
  return {
    start: getLocFromIndex(context.getSourceCode(), start),
    end: getLocFromIndex(context.getSourceCode(), end)
  };
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

const DEFAULT_FLOW_TYPES_OPTIONS = {
  fix: false,
  haste: false
};

function getOptions(optionValue) {
  if (optionValue) {
    return {
      fix: optionValue.fix || DEFAULT_FLOW_TYPES_OPTIONS.fix,
      haste: optionValue.haste || DEFAULT_FLOW_TYPES_OPTIONS.haste
    };
  }

  return DEFAULT_FLOW_TYPES_OPTIONS;
}

function genImportFixRange(type, imports, requires) {
  const typeImports = imports.filter(node => node.importKind === 'type');
  const alreadyHasImport = typeImports.some(node =>
    node.specifiers.some(
      specifier => (specifier.imported || specifier.local).name === type
    )
  );

  if (alreadyHasImport) {
    return null;
  }

  function getTypeImportName(node) {
    return (node.specifiers[0].local || node.specifiers[0].imported).name;
  }

  if (typeImports.length > 0) {
    let precedingImportIndex = 0;
    while (
      typeImports[precedingImportIndex + 1] &&
      getTypeImportName(typeImports[precedingImportIndex + 1]) < type
    ) {
      precedingImportIndex++;
    }

    return typeImports[precedingImportIndex].range;
  }

  if (imports.length > 0) {
    return imports[imports.length - 1].range;
  }

  if (requires.length > 0) {
    return requires[requires.length - 1].range;
  }

  // start of file
  return [0, 0];
}

function genImportFixer(fixer, importFixRange, type, haste, whitespace) {
  if (!importFixRange) {
    // HACK: insert nothing
    return fixer.replaceTextRange([0, 0], '');
  }
  if (haste) {
    return fixer.insertTextAfterRange(
      importFixRange,
      `\n${whitespace}import type {${type}} from '${type}.graphql'`
    );
  } else {
    return fixer.insertTextAfterRange(
      importFixRange,
      `\n${whitespace}import type {${type}} from './__generated__/${type}.graphql'`
    );
  }
}

const CREATE_CONTAINER_FUNCTIONS = new Set([
  'createFragmentContainer',
  'createPaginationContainer',
  'createRefetchContainer'
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
              expected: expectedName
            },
            fix: fixer =>
              fixer.replaceTextRange(
                getRange(context, taggedTemplateExpression, def.name),
                expectedName
              )
          });
        }
      }
    }
  });
}

function validateObjectTypeAnnotation(
  context,
  Component,
  type,
  propName,
  propType,
  importFixRange,
  onlyVerify
) {
  const options = getOptions(context.options[0]);
  const propTypeProperty = propType.properties.find(property => {
    // HACK: Type annotations don't currently expose a 'key' property:
    // https://github.com/babel/babel-eslint/issues/307

    let tokenIndex = 0;
    if (property.static) {
      tokenIndex++;
    }
    if (property.variance) {
      tokenIndex++;
    }

    return (
      context.getSourceCode().getFirstToken(property, tokenIndex).value ===
      propName
    );
  });
  let atleastOnePropertyExists = !!propType.properties[0];

  if (!propTypeProperty) {
    if (onlyVerify) {
      return false;
    }
    context.report({
      message:
        '`{{prop}}` is not declared in the `props` of the React component or it is not marked with the ' +
        'generated flow type `{{type}}`. See ' +
        'https://facebook.github.io/relay/docs/relay-compiler.html#importing-generated-definitions.',
      data: {
        prop: propName,
        type
      },
      fix: options.fix
        ? fixer => {
            const whitespace = ' '.repeat(Component.parent.loc.start.column);
            let fixes = [
              genImportFixer(
                fixer,
                importFixRange,
                type,
                options.haste,
                whitespace
              )
            ];
            if (atleastOnePropertyExists) {
              fixes.push(
                fixer.insertTextBefore(
                  propType.properties[0],
                  `${propName}: ${type}, `
                )
              );
            } else {
              fixes.push(fixer.replaceText(propType, `{${propName}: ${type}}`));
            }
            return fixes;
          }
        : null,
      loc: Component.loc
    });
    return false;
  }
  if (
    propTypeProperty.value.type === 'NullableTypeAnnotation' &&
    propTypeProperty.value.typeAnnotation.type === 'GenericTypeAnnotation' &&
    propTypeProperty.value.typeAnnotation.id.name === type
  ) {
    return true;
  }
  if (
    propTypeProperty.value.type !== 'GenericTypeAnnotation' ||
    propTypeProperty.value.id.name !== type
  ) {
    if (onlyVerify) {
      return false;
    }
    context.report({
      message:
        'Component property `{{prop}}` expects to use the generated ' +
        '`{{type}}` flow type. See https://facebook.github.io/relay/docs/relay-compiler.html#importing-generated-definitions.',
      data: {
        prop: propName,
        type
      },
      fix: options.fix
        ? fixer => {
            const whitespace = ' '.repeat(Component.parent.loc.start.column);
            return [
              genImportFixer(
                fixer,
                importFixRange,
                type,
                options.haste,
                whitespace
              ),
              fixer.replaceText(propTypeProperty.value, type)
            ];
          }
        : null,
      loc: Component.loc
    });
    return false;
  }
  return true;
}

module.exports.rules = {
  'graphql-syntax': {
    meta: {
      docs: {
        description:
          'Validates the syntax of all graphql`...` and ' +
          'graphql.experimental`...` templates.'
      }
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
                'graphql tagged templates do not support ${...} substitutions.'
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
                  loc: getLoc(context, node, definition)
                });
              }
            });
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
  },
  'compat-uses-vars': {
    meta: {
      docs: {
        description:
          'Relay Compat transforms fragment spreads from ' +
          "`...Container_foo` to `Container.getFragment('foo')`. This " +
          'makes ESLint aware of this.'
      }
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
                    varName: componentName
                  },
                  loc: getLoc(
                    context,
                    taggedTemplateExpression,
                    spreadNode.name
                  )
                });
              }
            }
          });
        }
      };
    }
  },
  'graphql-naming': {
    meta: {
      fixable: 'code',
      docs: {
        description: 'Validates naming conventions of graphql tags'
      }
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
                      actual: operationName
                    },
                    loc: getLoc(context, node, name)
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
                      callee: calleeToString(node.callee)
                    }
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
                    callee: calleeToString(node.callee)
                  }
                });
              }
            });
          }
        }
      };
    }
  },
  'generated-flow-types': {
    meta: {
      fixable: 'code',
      docs: {
        description: 'Validates usage of RelayModern generated flow types'
      },
      schema: [
        {
          type: 'object',
          properties: {
            fix: {
              type: 'boolean'
            },
            haste: {
              type: 'boolean'
            }
          },
          additionalProperties: false
        }
      ]
    },
    create(context) {
      if (!shouldLint(context)) {
        return {};
      }
      const options = getOptions(context.options[0]);
      let componentMap = {};
      let expectedTypes = [];
      let imports = [];
      let requires = [];
      let typeAliasMap = {};
      return {
        ImportDeclaration(node) {
          imports.push(node);
        },
        VariableDeclarator(node) {
          if (
            node.init &&
            node.init.type === 'CallExpression' &&
            node.init.callee.name === 'require'
          ) {
            requires.push(node);
          }
        },
        TypeAlias(node) {
          typeAliasMap[node.id.name] = node.right;
        },
        ClassDeclaration(node) {
          const componentName = node.id.name;
          componentMap[componentName] = {
            Component: node.id
          };
          // new style React.Component accepts 'props' as the first parameter
          if (node.superTypeParameters && node.superTypeParameters.params[0]) {
            componentMap[componentName].propType =
              node.superTypeParameters.params[0];
          } else {
            // old style React.Component declares the 'props' type inside the class
            node.body.body
              .filter(
                child =>
                  child.type === 'ClassProperty' &&
                  child.key.name === 'props' &&
                  child.typeAnnotation
              )
              .forEach(child => {
                componentMap[componentName].propType =
                  child.typeAnnotation.typeAnnotation;
              });
          }
        },
        TaggedTemplateExpression(node) {
          const ast = getGraphQLAST(node);
          if (!ast) {
            return;
          }

          const moduleName = getModuleName(context.getFilename());
          ast.definitions.forEach(def => {
            if (!def.name) {
              // no name, covered by graphql-naming/TaggedTemplateExpression
              return;
            }
            if (def.kind === 'FragmentDefinition') {
              expectedTypes.push(def.name.value);
            }
          });
        },
        'Program:exit': function(node) {
          expectedTypes.forEach(type => {
            const componentName = type.split('_')[0];
            const propName = type
              .split('_')
              .slice(1)
              .join('_');
            if (!componentName || !propName || !componentMap[componentName]) {
              // incorrect name, covered by graphql-naming/CallExpression
              return;
            }
            const Component = componentMap[componentName].Component;
            const propType = componentMap[componentName].propType;

            // resolve local type alias
            const importedPropType = imports.reduce((acc, node) => {
              if (node.specifiers) {
                const typeSpecifier = node.specifiers.find(specifier => {
                  if (specifier.type !== 'ImportSpecifier') {
                    return false;
                  }
                  return specifier.imported.name === type;
                });
                if (typeSpecifier) {
                  return typeSpecifier.local.name;
                }
              }
              return acc;
            }, type);

            const importFixRange = genImportFixRange(
              importedPropType,
              imports,
              requires
            );

            if (propType) {
              // There exists a prop typeAnnotation. Let's look at how it's
              // structured
              switch (propType.type) {
                case 'ObjectTypeAnnotation':
                  validateObjectTypeAnnotation(
                    context,
                    Component,
                    importedPropType,
                    propName,
                    propType,
                    importFixRange
                  );
                  break;
                case 'GenericTypeAnnotation':
                  const alias = propType.id.name;
                  if (!typeAliasMap[alias]) {
                    // The type Alias doesn't exist, is invalid, or is being
                    // imported. Can't do anything.
                    break;
                  }
                  switch (typeAliasMap[alias].type) {
                    case 'ObjectTypeAnnotation':
                      validateObjectTypeAnnotation(
                        context,
                        Component,
                        importedPropType,
                        propName,
                        typeAliasMap[alias],
                        importFixRange
                      );
                      break;
                    case 'IntersectionTypeAnnotation':
                      const objectTypes = typeAliasMap[alias].types
                        .map(intersectedType => {
                          if (
                            intersectedType.type === 'GenericTypeAnnotation'
                          ) {
                            return typeAliasMap[intersectedType.id.name];
                          }
                          if (intersectedType.type === 'ObjectTypeAnnotation') {
                            return intersectedType;
                          }
                        })
                        .filter(Boolean);
                      if (!objectTypes.length) {
                        // The type Alias is likely being imported.
                        // Can't do anything.
                        break;
                      }
                      const lintResults = objectTypes.map(objectType =>
                        validateObjectTypeAnnotation(
                          context,
                          Component,
                          importedPropType,
                          propName,
                          objectType,
                          importFixRange,
                          true // Return false if invalid instead of reporting
                        )
                      );
                      if (lintResults.some(result => result)) {
                        // One of the intersected bojects has it right
                        break;
                      }
                      validateObjectTypeAnnotation(
                        context,
                        Component,
                        importedPropType,
                        propName,
                        objectTypes[0],
                        importFixRange
                      );
                      break;
                  }
                  break;
              }
            } else {
              context.report({
                message:
                  'Component property `{{prop}}` expects to use the ' +
                  'generated `{{type}}` flow type. See https://facebook.github.io/relay/docs/relay-compiler.html#importing-generated-definitions.',
                data: {
                  prop: propName,
                  type: importedPropType
                },
                fix: options.fix
                  ? fixer => {
                      const classBodyStart = Component.parent.body.body[0];
                      if (!classBodyStart) {
                        // HACK: There's nothing in the body. Let's not do anything
                        // When something is added to the body, we'll have a fix
                        return;
                      }
                      const aliasWhitespace = ' '.repeat(
                        Component.parent.loc.start.column
                      );
                      const propsWhitespace = ' '.repeat(
                        classBodyStart.loc.start.column
                      );
                      return [
                        genImportFixer(
                          fixer,
                          importFixRange,
                          importedPropType,
                          options.haste,
                          aliasWhitespace
                        ),
                        fixer.insertTextBefore(
                          Component.parent,
                          `type Props = {${propName}: ` +
                            `${importedPropType}};\n\n${aliasWhitespace}`
                        ),
                        fixer.insertTextBefore(
                          classBodyStart,
                          `props: Props;\n\n${propsWhitespace}`
                        )
                      ];
                    }
                  : null,
                loc: Component.loc
              });
            }
          });
        }
      };
    }
  }
};
