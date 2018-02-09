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

const HAS_ESLINT_BEEN_UPGRADED_YET = false;

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
  parserOptions: {ecmaVersion: 6, ecmaFeatures: {jsx: true}}
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
      filename: '/path/to/test.js',
      code: 'graphql`fragment F on User {\n  id()\n}`;',
      errors: [
        {
          message: `Syntax Error: Expected Name, found )`
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

ruleTester.run('generated-flow-types', rules['generated-flow-types'], {
  valid: valid.concat([
    // syntax error, covered by `graphql-syntax`
    {code: 'graphql`query {{{`'},
    {
      code: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component {
          props: {user: MyComponent_user};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
    },
    {
      code: `
        import type {MyComponent_user as User} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component {
          props: {user: User};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
    },
    {
      code: `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
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
      `
    },
    {
      code: `
        import type {MyComponent_double_underscore} from 'MyComponent_double_underscore.graphql'
        type Props = {
          double_underscore: MyComponent_double_underscore,
        }

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          double_underscore: graphql\`fragment MyComponent_double_underscore on User {id}\`,
        });
      `
    },
    {
      code: `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
        type Props = {
          +user: MyComponent_user,
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
      `
    },
    {
      code: `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
        type Props = {
          user?: MyComponent_user,
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
      `
    },
    {
      code: `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
        type Props = {|
          +user: MyComponent_user,
        |}

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
    },
    {
      code: `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
        type Props = {|
          +user: ?MyComponent_user,
        |}

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
    },
    {
      code: `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
        type Props = {
          user: MyComponent_user,
        }

        class MyComponent extends React.Component<Props> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
    },
    {
      code: `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
        type Props = {
          user: MyComponent_user,
        }
        type State = {
          count: number,
        }

        class MyComponent extends React.Component<Props, State> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
    },
    {
      code: `
        type RelayProps = {
          user: MyComponent_user
        }

        type Props = {
          other: ?Object,
        } & RelayProps;

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
    }
  ]),
  invalid: [
    {
      filename: 'MyComponent.jsx',
      code: `
        class MyComponent extends React.Component {
          props: {};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component {
          props: {user: MyComponent_user};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            '`user` is not declared in the `props` of the React component or ' +
            'it is not marked with the generated flow type ' +
            '`MyComponent_user`. See ' +
            'https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 2,
          column: 15
        }
      ]
    },
    {
      filename: 'Profile.js',
      code: `
        type Props = {
          user: ?{
            id: number,
          },
        };
        class Profile extends React.Component<Props> {}
        createFragmentContainer(Profile, {
          user: graphql\`
            fragment Profile_user on User {
              id
            }
          \`,
        });
      `,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`Profile_user` flow type. See ' +
            'https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 7,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        class MyComponent extends React.Component {
          props: {somethingElse: number};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component {
          props: {user: MyComponent_user, somethingElse: number};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            '`user` is not declared in the `props` of the React component or it is not marked with the generated flow type `MyComponent_user`. ' +
            'See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 2,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        class MyComponent extends React.Component {
          props: {user: number};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component {
          props: {user: MyComponent_user};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 2,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        class MyComponent extends React.Component {
          props: {user: Random_user};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component {
          props: {user: MyComponent_user};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 2,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        type Props = {};

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
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            '`user` is not declared in the `props` of the React component or it is not marked with the generated flow type `MyComponent_user`. ' +
            'See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 4,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        type Props = {somethingElse: number};

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
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user, somethingElse: number};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            '`user` is not declared in the `props` of the React component or it is not marked with the generated flow type `MyComponent_user`. ' +
            'See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 4,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        type Props = {user: number};

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
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 4,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        type Props = {user: Random_user};

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
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 4,
          column: 15
        }
      ]
    },
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
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 2,
          column: 15
        }
      ]
    },
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
      options: [{haste: true}],
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from 'MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 2,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'

        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'

        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 4,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        import type aaa from 'aaa'
        import type zzz from 'zzz'

        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type aaa from 'aaa'
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        import type zzz from 'zzz'

        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 5,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        import type {aaa} from 'aaa'
        import type zzz from 'zzz'

        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {aaa} from 'aaa'
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        import type zzz from 'zzz'

        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 5,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        import {aaa} from 'aaa'
        import zzz from 'zzz'

        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import {aaa} from 'aaa'
        import zzz from 'zzz'
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'

        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 5,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        const aaa = require('aaa')
        const zzz = require('zzz')

        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        const aaa = require('aaa')
        const zzz = require('zzz')
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'

        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 5,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        const aaa = require('aaa')

        import zzz from 'zzz'

        import type ccc from 'ccc'
        import type {xxx} from 'xxx'

        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        const aaa = require('aaa')

        import zzz from 'zzz'

        import type ccc from 'ccc'
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        import type {xxx} from 'xxx'

        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 9,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        import {aaa} from 'aaa'
        import zzz from 'zzz'

        class MyComponent extends React.Component {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import {aaa} from 'aaa'
        import zzz from 'zzz'
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'

        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component {
          props: Props;

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 5,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        import type {MyComponent_user as User} from 'aaa'

        class MyComponent extends React.Component {
          props: { user: MyComponent_user }

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user as User} from 'aaa'

        class MyComponent extends React.Component {
          props: { user: User }

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`User` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 4,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        type OtherProps = {
          other: string
        }

        type Props = {
          user: ?Object,
        } & OtherProps;

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
      output: HAS_ESLINT_BEEN_UPGRADED_YET
        ? `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component {
          props: {user: MyComponent_user};

          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `
        : null,
      errors: [
        {
          message:
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 10,
          column: 15
        }
      ]
    }
  ]
});
