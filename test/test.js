/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const rules = require('..').rules;
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({parserOptions: {ecmaVersion: 6, ecmaFeatures: {jsx: true}}});

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
      filename: '/path/to/test.js',
      code: 'graphql`fragment F on User {\n  id()\n}`;',
      errors: [
        {
          message: `Syntax Error test.js (2:6) Expected Name, found )

1: fragment F on User {
2:   id()
        ^
3: }
`
        }
      ]
    }
  ]
});

ruleTester.run('graphql-naming', rules['graphql-naming'], {
  valid: [
    ...valid,
    // syntax error, covered by `graphql-syntax`
    {code: 'graphql`query {{{`'}
  ],
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
              'graphql`...` or graphql.experimental`...`.'
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

ruleTester.run('generated-flow-types', rules['generated-flow-types'], {
  valid: [
    ...valid,
    // syntax error, covered by `graphql-syntax`
    {code: 'graphql`query {{{`'}
  ],
  invalid: [
    {
      filename: 'MyComponent.jsx',
      code: `
        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: `
        type Props = {
          user: MyComponent_user,
        }

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      errors: [
        {
          message:
            'React components with fragments must use the ' +
              'generated `<ModuleName>_<propName>` flow type.'
        }
      ]
    },
  ]
});
