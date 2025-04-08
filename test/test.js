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
    parserOptions: { requireConfigFile: false, babelOptions: { "presets": ["@babel/preset-flow", "@babel/preset-react"] } }
  },
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

ruleTester.run('generated-flow-types', rules['generated-flow-types'], {
  valid: valid.concat([
    // syntax error, covered by `graphql-syntax`
    {code: 'graphql`query {{{`'},
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from './path/to/TestFragment_foo.graphql';
        useFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `
    },
    {
      code: `
        import {type TestFragment_foo$key} from './path/to/TestFragment_foo.graphql';
        useFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useRefetchableFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';

        const ref = useFragment(graphql\`fragment TestFragment_foo on User { id }\`, props.user);
        usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestPaginationFragment_foo on User { id }\`, ref);
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';

        const {data: ref} = useFragment(graphql\`fragment TestFragment_foo on User { id }\`, props.user);
        usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestPaginationFragment_foo on User { id }\`, ref);
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useBlockingPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useLegacyPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
      `
    },
    {code: 'useQuery<Foo>(graphql`query Foo { id }`)'},
    {code: 'useLazyLoadQuery<Foo>(graphql`query Foo { id }`)'},
    {
      code: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component<{user: MyComponent_user}> {
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
        class MyComponent extends React.Component<{user: User}> {
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
        import type {MyComponent_double_underscore} from 'MyComponent_double_underscore.graphql'
        type Props = {
          double_underscore: MyComponent_double_underscore,
        }

        class MyComponent extends React.Component<Props> {
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
          user?: MyComponent_user,
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
        type Props = {|
          +user: MyComponent_user,
        |}

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
        type RelayProps = {|
          +user: MyComponent_user,
        |}
        type Props = {|
          ...RelayProps,
          id: 3
        |}
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
        type RealProps = {
          +user: MyComponent_user,
        }
        type RelayProps = {|
          ...RelayProps,
          ...RealProps
        |}
        type Props = {|
          ...RelayProps,
          id: 3
        |}
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
        type RealProps = $ReadOnly<{
          +user: MyComponent_user,
        }>
        type RelayProps = $ReadOnly<{|
          ...RelayProps,
          ...RealProps
        |}>
        type Props = $ReadOnly<{|
          ...RelayProps,
          id: 3
        |}>
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
        type RealProps = $ReadOnly<{
          +user: MyComponent_user,
        }>
        type RealPropsAlias = RealProps
        type RealPropsAlias2 = RealPropsAlias
        type RelayProps = $ReadOnly<{|
          ...RelayProps,
          ...RealPropsAlias2
        |}>
        type Props = {|
          ...RelayProps,
          id: 3
        |}
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
        type RealProps = $ReadOnly<{
          +user: MyComponent_user,
        }>
        type RealPropsAlias = RealProps
        type RelayProps = $ReadOnly<{|
          ...RelayProps,
          ...RealPropsAlias
        |}>
        type RelayPropsAlias = $ReadOnly<RelayProps>
        type Props = {|
          ...RelayPropsAlias,
          id: 3
        |}
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
        type Props = {|
          +user: ?MyComponent_user,
        |}

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
    }
  ]),
  invalid: [
    {
      // imports TestFragment_other$key instead of TestFragment_foo$key
      code: `
        import type {TestFragment_other$key} from './path/to/TestFragment_other.graphql';
        useFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      errors: [
        {
          message: `
The prop passed to useFragment() should be typed with the type 'TestFragment_foo$key' imported from 'TestFragment_foo.graphql', e.g.:

  import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';`.trim(),
          line: 3,
          column: 9
        }
      ]
    },
    {
      // Should import the type using `import type {xyz} from ...` or `import {type xyz} from ...`
      code: `
        import {TestFragment_foo$key} from './path/to/TestFragment_foo.graphql';
        useFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      errors: [
        {
          message: `
The prop passed to useFragment() should be typed with the type 'TestFragment_foo$key' imported from 'TestFragment_foo.graphql', e.g.:

  import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';`.trim(),
          line: 3,
          column: 9
        }
      ]
    },
    {
      code: `
        import type {other} from 'TestFragment_foo.graphql';
        useFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      errors: [
        {
          message: `
The prop passed to useFragment() should be typed with the type 'TestFragment_foo$key' imported from 'TestFragment_foo.graphql', e.g.:

  import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';`.trim(),
          line: 3,
          column: 9
        }
      ]
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useRefetchableFragment(graphql\`fragment TestFragment_foo on User @refetchable(queryName:"TestFragmentQuery") { id }\`)
      `,
      errors: [
        {
          message:
            'The `useRefetchableFragment` hook should be used with an explicit generated Flow type, e.g.: useRefetchableFragment<TestFragmentQuery, _>(...)',
          line: 3,
          column: 9
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
import type {TestFragmentQuery} from './__generated__/TestFragmentQuery.graphql'
        useRefetchableFragment<TestFragmentQuery, _>(graphql\`fragment TestFragment_foo on User @refetchable(queryName:"TestFragmentQuery") { id }\`)
      `
    },
//     {
//       code: `
//         useRefetchableFragment<RefetchQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
//       `,
//       errors: [
//         {
//           message: `
// The prop passed to useRefetchableFragment() should be typed with the type 'TestFragment_foo$key' imported from 'TestFragment_foo.graphql', e.g.:
//
//   import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';`.trim(),
//           line: 2,
//           column: 9
//         }
//       ]
//     },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        usePaginationFragment(graphql\`fragment TestFragment_foo on User @refetchable(queryName: "TestFragmentQuery") { id }\`)
      `,
      options: DEFAULT_OPTIONS,
      errors: [
        {
          message:
            'The `usePaginationFragment` hook should be used with an explicit generated Flow type, e.g.: usePaginationFragment<TestFragmentQuery, _>(...)',
          line: 3,
          column: 9
        }
      ],
      output: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
import type {TestFragmentQuery} from './__generated__/TestFragmentQuery.graphql'
        usePaginationFragment<TestFragmentQuery, _>(graphql\`fragment TestFragment_foo on User @refetchable(queryName: "TestFragmentQuery") { id }\`)
      `
    },
//     {
//       code: `
//         usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
//       `,
//       errors: [
//         {
//           message: `
// The prop passed to usePaginationFragment() should be typed with the type 'TestFragment_foo$key' imported from 'TestFragment_foo.graphql', e.g.:
//
//   import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';`.trim(),
//           line: 2,
//           column: 9
//         }
//       ]
//     },
//     {
//       code: `
//         import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
//
//         const refUnused = useFragment(graphql\`fragment TestFragment_foo on User { id }\`, props.user);
//         usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestPaginationFragment_foo on User { id }\`, ref);
//       `,
//       errors: [
//         {
//           message: `
// The prop passed to usePaginationFragment() should be typed with the type 'TestPaginationFragment_foo$key' imported from 'TestPaginationFragment_foo.graphql', e.g.:
//
//   import type {TestPaginationFragment_foo$key} from 'TestPaginationFragment_foo.graphql';`.trim(),
//           line: 5,
//           column: 9
//         }
//       ]
//     },
//     {
//       code: `
//         import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
//
//         const {data: refUnused }= useFragment(graphql\`fragment TestFragment_foo on User { id }\`, props.user);
//         usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestPaginationFragment_foo on User { id }\`, ref);
//       `,
//       errors: [
//         {
//           message: `
// The prop passed to usePaginationFragment() should be typed with the type 'TestPaginationFragment_foo$key' imported from 'TestPaginationFragment_foo.graphql', e.g.:
//
//   import type {TestPaginationFragment_foo$key} from 'TestPaginationFragment_foo.graphql';`.trim(),
//           line: 5,
//           column: 9
//         }
//       ]
//     },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useBlockingPaginationFragment(graphql\`fragment TestFragment_foo on User @refetchable(queryName: "TestFragmentQuery") { id }\`)
      `,
      errors: [
        {
          message:
            'The `useBlockingPaginationFragment` hook should be used with an explicit generated Flow type, e.g.: useBlockingPaginationFragment<TestFragmentQuery, _>(...)',
          line: 3,
          column: 9
        }
      ]
    },
//     {
//       code: `
//         useBlockingPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
//       `,
//       errors: [
//         {
//           message: `
// The prop passed to useBlockingPaginationFragment() should be typed with the type 'TestFragment_foo$key' imported from 'TestFragment_foo.graphql', e.g.:
//
//   import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';`.trim(),
//           line: 2,
//           column: 9
//         }
//       ]
//     },

    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useLegacyPaginationFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      options: DEFAULT_OPTIONS,
      errors: [
        {
          message:
            'The `useLegacyPaginationFragment` hook should be used with an explicit generated Flow type, e.g.: useLegacyPaginationFragment<PaginationQuery, _>(...)',
          line: 3,
          column: 9
        }
      ],
      output: null
    },
//     {
//       code: `
//         useLegacyPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
//       `,
//       errors: [
//         {
//           message: `
// The prop passed to useLegacyPaginationFragment() should be typed with the type 'TestFragment_foo$key' imported from 'TestFragment_foo.graphql', e.g.:
//
//   import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';`.trim(),
//           line: 2,
//           column: 9
//         }
//       ]
//     },

    {
      code: `\nuseQuery(graphql\`query FooQuery { id }\`)`,
      errors: [
        {
          message:
            'The `useQuery` hook should be used with an explicit generated Flow type, e.g.: useQuery<FooQuery>(...)',
          line: 2,
          column: 1
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooQuery} from './__generated__/FooQuery.graphql'
useQuery<FooQuery>(graphql\`query FooQuery { id }\`)`
    },
    {
      code: `
        const query = graphql\`query FooQuery { id }\`;
        const query2 = query;
        useQuery(query2);
      `,
      errors: [
        {
          message:
            'The `useQuery` hook should be used with an explicit generated Flow type, e.g.: useQuery<FooQuery>(...)',
          line: 4
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooQuery} from './__generated__/FooQuery.graphql'
        const query = graphql\`query FooQuery { id }\`;
        const query2 = query;
        useQuery<FooQuery>(query2);
      `
    },
    {
      code: `
        const query = 'graphql';
        useQuery(query);
      `,
      options: DEFAULT_OPTIONS,
      errors: [
        {
          message:
            'The `useQuery` hook should be used with an explicit generated Flow type, e.g.: useQuery<ExampleQuery>(...)',
          line: 3
        }
      ],
      output: null
    },

    {
      code: `\nuseLazyLoadQuery(graphql\`query FooQuery { id }\`)`,
      errors: [
        {
          message:
            'The `useLazyLoadQuery` hook should be used with an explicit generated Flow type, e.g.: useLazyLoadQuery<FooQuery>(...)',
          line: 2,
          column: 1
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooQuery} from './__generated__/FooQuery.graphql'
useLazyLoadQuery<FooQuery>(graphql\`query FooQuery { id }\`)`
    },
    {
      code: `
        const query = graphql\`query FooQuery { id }\`;
        const query2 = query;
        useLazyLoadQuery(query2);
      `,
      errors: [
        {
          message:
            'The `useLazyLoadQuery` hook should be used with an explicit generated Flow type, e.g.: useLazyLoadQuery<FooQuery>(...)',
          line: 4
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooQuery} from './__generated__/FooQuery.graphql'
        const query = graphql\`query FooQuery { id }\`;
        const query2 = query;
        useLazyLoadQuery<FooQuery>(query2);
      `
    },
    {
      code: `
        const query = 'graphql';
        useLazyLoadQuery(query);
      `,
      options: DEFAULT_OPTIONS,
      errors: [
        {
          message:
            'The `useLazyLoadQuery` hook should be used with an explicit generated Flow type, e.g.: useLazyLoadQuery<ExampleQuery>(...)',
          line: 3
        }
      ],
      output: null
    },
    {
      code: `\nconst mutation = graphql\`mutation FooMutation { id }\`;\nconst [commit] = useMutation(mutation);`,
      options: DEFAULT_OPTIONS,
      errors: [
        {
          message:
            'The `useMutation` hook should be used with an explicit generated Flow type, e.g.: useMutation<FooMutation>(...)',
          line: 3
        }
      ],
      output: `
import type {FooMutation} from './__generated__/FooMutation.graphql'
const mutation = graphql\`mutation FooMutation { id }\`;
const [commit] = useMutation<FooMutation>(mutation);`
    },
    {
      code: `\ncommitMutation(environemnt, {mutation: graphql\`mutation FooMutation { id }\`})`,
      errors: [
        {
          message:
            'The `commitMutation` must be used with an explicit generated Flow type, e.g.: commitMutation<FooMutation>(...)',
          line: 2,
          column: 1
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooMutation} from './__generated__/FooMutation.graphql'
commitMutation<FooMutation>(environemnt, {mutation: graphql\`mutation FooMutation { id }\`})`
    },
    {
      code: `
        const mutation = graphql\`mutation FooMutation { id }\`;
        commitMutation(environment, {mutation});
      `,
      errors: [
        {
          message:
            'The `commitMutation` must be used with an explicit generated Flow type, e.g.: commitMutation<FooMutation>(...)',
          line: 3
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooMutation} from './__generated__/FooMutation.graphql'
        const mutation = graphql\`mutation FooMutation { id }\`;
        commitMutation<FooMutation>(environment, {mutation});
      `
    },
    {
      code: `
        const mutation = graphql\`mutation FooMutation { id }\`;
        const myMutation = mutation;
        commitMutation(environment, {mutation: myMutation});
      `,
      errors: [
        {
          message:
            'The `commitMutation` must be used with an explicit generated Flow type, e.g.: commitMutation<FooMutation>(...)',
          line: 4
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooMutation} from './__generated__/FooMutation.graphql'
        const mutation = graphql\`mutation FooMutation { id }\`;
        const myMutation = mutation;
        commitMutation<FooMutation>(environment, {mutation: myMutation});
      `
    },
    {
      code: `\nrequestSubscription(environemnt, {subscription: graphql\`subscription FooSubscription { id }\`})`,
      errors: [
        {
          message:
            'The `requestSubscription` must be used with an explicit generated Flow type, e.g.: requestSubscription<FooSubscription>(...)',
          line: 2,
          column: 1
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooSubscription} from './__generated__/FooSubscription.graphql'
requestSubscription<FooSubscription>(environemnt, {subscription: graphql\`subscription FooSubscription { id }\`})`
    },
    {
      code: `
        const subscription = graphql\`subscription FooSubscription { id }\`;
        requestSubscription(environment, {subscription});
      `,
      errors: [
        {
          message:
            'The `requestSubscription` must be used with an explicit generated Flow type, e.g.: requestSubscription<FooSubscription>(...)',
          line: 3
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooSubscription} from './__generated__/FooSubscription.graphql'
        const subscription = graphql\`subscription FooSubscription { id }\`;
        requestSubscription<FooSubscription>(environment, {subscription});
      `
    },
    {
      code: `
        const subscription = graphql\`subscription FooSubscription { id }\`;
        const mySubscription = subscription;
        requestSubscription(environment, {subscription: mySubscription});
      `,
      errors: [
        {
          message:
            'The `requestSubscription` must be used with an explicit generated Flow type, e.g.: requestSubscription<FooSubscription>(...)',
          line: 4
        }
      ],
      options: DEFAULT_OPTIONS,
      output: `
import type {FooSubscription} from './__generated__/FooSubscription.graphql'
        const subscription = graphql\`subscription FooSubscription { id }\`;
        const mySubscription = subscription;
        requestSubscription<FooSubscription>(environment, {subscription: mySubscription});
      `
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        class MyComponent extends React.Component<{}> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component<{user: MyComponent_user}> {
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
        class MyComponent extends React.Component<{somethingElse: number}> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component<{user: MyComponent_user, somethingElse: number}> {
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
        class MyComponent extends React.Component<{user: number}> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component<{user: MyComponent_user}> {
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
            'Component property `user` expects to use the generated ' +
            '`MyComponent_user` flow type. See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 2,
          column: 15
        }
      ]
    },
    {
      filename: 'path/to/Example.js',
      // Test multiple layers of intersection types.
      code: `
        type Props = {} & {};
        type MergedProps = {} & Props;
        class Example extends React.PureComponent<MergedProps> {
        }
        module.exports = createFragmentContainer(Example, {
          user: graphql\`fragment Example_user on User { id }\`,
        });
      `,
      errors: [
        {
          message:
            '`user` is not declared in the `props` of the React component or it is not marked with the generated flow type `Example_user`. ' +
            'See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 4,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        class MyComponent extends React.Component<{user: Random_user}> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        class MyComponent extends React.Component<{user: MyComponent_user}> {
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

        class MyComponent extends React.Component<Props> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user, somethingElse: number};

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
          render() {
            return <div />;
          }
        }

        createFragmentContainer(MyComponent, {
          user: graphql\`fragment MyComponent_user on User {id}\`,
        });
      `,
      options: DEFAULT_OPTIONS,
      output: `
        import type {MyComponent_user} from './__generated__/MyComponent_user.graphql'
        type Props = {user: MyComponent_user};

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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

        class MyComponent extends React.Component<Props> {
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
        import type {MyComponent_user as User} from 'aaa'

        class MyComponent extends React.Component<{ user: MyComponent_user }> {
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

        class MyComponent extends React.Component<{ user: User }> {
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

        class MyComponent extends React.Component<Props> {
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
        class MyComponent extends React.Component<{user: MyComponent_user}> {
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
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        type RelayProps = {
          user: MyComponent_user
        }

        type Props = {
          other: ?Object,
        } & RelayProps;

        class MyComponent extends React.Component<Props> {
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
            '`user` is not declared in the `props` of the React component or it is not marked with the generated flow type `MyComponent_user`. ' +
            'See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 10,
          column: 15
        }
      ]
    },
    {
      filename: 'MyComponent.jsx',
      code: `
        type RelayProps = {
          users: MyComponent_user
        }

        type Props = {
          other: ?Object,
          ...RelayProps
        }

        class MyComponent extends React.Component<Props> {
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
            '`user` is not declared in the `props` of the React component or it is not marked with the generated flow type `MyComponent_user`. ' +
            'See https://facebook.github.io/relay/docs/en/graphql-in-relay.html#importing-generated-definitions',
          line: 11,
          column: 15
        }
      ]
    }
  ]
});
