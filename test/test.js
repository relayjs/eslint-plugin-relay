/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const rules = require('..').rules;
const RuleTester = require('eslint').RuleTester;

const HAS_ESLINT_BEEN_UPGRADED_YET = false;
const DEFAULT_OPTIONS = [
  {
    fix: true,
    haste: false
  }
];

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    parser: require('@babel/eslint-parser'),
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {presets: ['@babel/preset-flow', '@babel/preset-react']}
    }
  }
});

const valid = [
  {code: 'hello();'},
  {code: 'graphql`fragment Foo on Node { id }`'},
  {
    filename: 'path/to/Example.react.js',
    code: `
      createFragmentContainer(Component, {
        user: graphql\`fragment Example_user on User {id}\`,
      });
    `
  },
  {
    filename: 'path/to/MyComponent.react.js',
    code: 'graphql`query MyComponent { me { name }}`;'
  },
  {
    filename: 'path/to/MyComponent.react.js',
    code: 'graphql`query MyComponentBla { me { name }}`;'
  },
  {
    filename: 'path/to/MyComponent.jsx',
    code: `createFragmentContainer(Component, {
      user: graphql\`fragment MyComponent_user on User {id}\`,
    });`
  }
];

ruleTester.run('graphql-syntax', rules['graphql-syntax'], {
  valid: valid,
  invalid: [
    // missing name on query
    {
      filename: 'path/to/Example.react.js',
      code: [
        'graphql`query{test}`;',
        'graphql`{test}`;',
        'graphql`subscription {test}`;',
        'graphql`mutation {test}`;'
      ].join('\n'),
      errors: [
        {
          message: 'Operations in graphql tags require a name.',
          line: 1,
          column: 9
        },
        {
          message: 'Operations in graphql tags require a name.',
          line: 2,
          column: 9
        },
        {
          message: 'Operations in graphql tags require a name.',
          line: 3,
          column: 9
        },
        {
          message: 'Operations in graphql tags require a name.',
          line: 4,
          column: 9
        }
      ]
    },
    {
      code: 'test;\ngraphql`fragment Test on User { ${x} }`;',
      errors: [
        {
          message:
            'graphql tagged templates do not support ${...} substitutions.'
        }
      ]
    },
    {
      code: 'graphql`fragment Test on User { id } fragment Test2 on User { id }`;',
      errors: [
        {
          message:
            'graphql tagged templates can only contain a single definition.'
        }
      ]
    },
    {
      filename: '/path/to/test.js',
      code: 'graphql`fragment F on User {\n  id()\n}`;',
      errors: [
        {
          message: `Syntax Error: Expected Name, found ")".`
        }
      ]
    }
  ]
});

ruleTester.run('graphql-naming', rules['graphql-naming'], {
  valid: valid.concat([
    // syntax error, covered by `graphql-syntax`
    {code: 'graphql`query {{{`'}
  ]),
  invalid: [
    {
      filename: 'path/to/Example.react.js',
      code: '    graphql`         query RandomName { me { name }}`;',
      errors: [
        {
          message:
            'Operations should start with the module name. Expected prefix ' +
            '`Example`, got `RandomName`.',
          line: 1,
          column: 28,
          endLine: 1,
          endColumn: 38
        }
      ]
    },
    {
      filename: 'path/to/Example.react.js',
      code: `
        const createFragmentContainer = require('relay-runtime');
        var UserFragment;
        createFragmentContainer(Component, {
          user: junk\`fragment Example_user on User { id }\`,
        });
      `,
      errors: [
        {
          message:
            '`createFragmentContainer` expects GraphQL to be tagged with ' +
            'graphql`...`.'
        }
      ]
    },
    {
      filename: 'path/to/Example.react.js',
      code: `
        const createFragmentContainer = require('relay-runtime');
        var UserFragment;
        createFragmentContainer(Component, {
          user: UserFragment,
        });
      `,
      errors: [
        {
          message:
            '`createFragmentContainer` expects fragment definitions to be ' +
            '`key: graphql`.'
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        createFragmentContainer(Component, {
          user: graphql\`fragment Random on User {id}\`,
        });
      `,
      output: `
        createFragmentContainer(Component, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      errors: [
        {
          message:
            'Container fragment names must be `<ModuleName>_<propName>`. Got ' +
            '`Random`, expected `MyComponent_user`.'
        }
      ]
    },
    {
      code: `
        createFragmentContainer(Component, {
          [user]: graphql\`fragment Random on User {id}\`,
        });
      `,
      errors: [
        {
          message:
            '`createFragmentContainer` expects fragment definitions to be ' +
            '`key: graphql`.'
        }
      ]
    }
  ]
});