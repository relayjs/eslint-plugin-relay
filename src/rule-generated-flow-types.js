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
const shouldLint = utils.shouldLint;
const getGraphQLAST = utils.getGraphQLAST;
const getModuleName = utils.getModuleName;

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
        'https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
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
        '`{{type}}` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
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

module.exports = {
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
                        if (intersectedType.type === 'GenericTypeAnnotation') {
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
                'generated `{{type}}` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
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
};
