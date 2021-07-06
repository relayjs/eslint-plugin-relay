'use strict';

const rules = require('..').rules;
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {ecmaVersion: 6, ecmaFeatures: {jsx: true}}
});

ruleTester.run(
  '[typescript] generated-flow-types',
  rules['generated-flow-types'],
  {
    valid: [
      {
        code: `
          import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
          usePaginationFragment<PaginationQuery>(graphql\`fragment TestFragment_foo on User { id }\`)
        `
      },
      {
        code: `
          import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
  
          const ref = useFragment(graphql\`fragment TestFragment_foo on User { id }\`, props.user);
          usePaginationFragment<PaginationQuery>(graphql\`fragment TestPaginationFragment_foo on User { id }\`, ref);
        `
      },
      {
        code: `
          import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
  
          const {data: ref} = useFragment(graphql\`fragment TestFragment_foo on User { id }\`, props.user);
          usePaginationFragment<PaginationQuery>(graphql\`fragment TestPaginationFragment_foo on User { id }\`, ref);
        `
      },
      {
        code: `
          import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
          useBlockingPaginationFragment<PaginationQuery>(graphql\`fragment TestFragment_foo on User { id }\`)
        `
      },
      {
        code: `
          import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
          useLegacyPaginationFragment<PaginationQuery>(graphql\`fragment TestFragment_foo on User { id }\`)
        `
      },
      {code: 'useQuery<Foo>(graphql`query Foo { id }`)'},
      {code: 'useLazyLoadQuery<Foo>(graphql`query Foo { id }`)'}
    ],
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
            column: 11
          }
        ]
      },
      {
        code: `\nuseQuery(graphql\`query ExampleQuery { id }\`)`,
        errors: [
          {
            message:
              'The `useQuery` hook should be used with an explicit generated Flow type, e.g.: useQuery<ExampleQuery>(...)',
            line: 2,
            column: 1
          }
        ]
      },
      {
        code: `
          const query = graphql\`query ExampleQuery { id }\`;
          const query2 = query;
          useQuery(query2);
        `,
        errors: [
          {
            message:
              'The `useQuery` hook should be used with an explicit generated Flow type, e.g.: useQuery<ExampleQuery>(...)',
            line: 4
          }
        ]
      },
      {
        code: `
          const query = 'graphql';
          useQuery(query);
        `,

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
        code: `\nuseLazyLoadQuery(graphql\`query ExampleQuery { id }\`)`,
        errors: [
          {
            message:
              'The `useLazyLoadQuery` hook should be used with an explicit generated Flow type, e.g.: useLazyLoadQuery<ExampleQuery>(...)',
            line: 2,
            column: 1
          }
        ]
      },
      {
        code: `
          const query = graphql\`query ExampleQuery { id }\`;
          const query2 = query;
          useLazyLoadQuery(query2);
        `,
        errors: [
          {
            message:
              'The `useLazyLoadQuery` hook should be used with an explicit generated Flow type, e.g.: useLazyLoadQuery<ExampleQuery>(...)',
            line: 4
          }
        ]
      },
      {
        code: `
          const query = 'graphql';
          useLazyLoadQuery(query);
        `,
        errors: [
          {
            message:
              'The `useLazyLoadQuery` hook should be used with an explicit generated Flow type, e.g.: useLazyLoadQuery<ExampleQuery>(...)',
            line: 3
          }
        ]
      },
      {
        code: `\ncommitMutation(environemnt, {mutation: graphql\`mutation ExampleMutation { id }\`})`,
        errors: [
          {
            message:
              'The `commitMutation` must be used with an explicit generated Flow type, e.g.: commitMutation<ExampleMutation>(...)',
            line: 2,
            column: 1
          }
        ]
      },
      {
        code: `
          const mutation = graphql\`mutation ExampleMutation { id }\`;
          commitMutation(environment, {mutation});
        `,
        errors: [
          {
            message:
              'The `commitMutation` must be used with an explicit generated Flow type, e.g.: commitMutation<ExampleMutation>(...)',
            line: 3
          }
        ]
      },
      {
        code: `
          const mutation = graphql\`mutation ExampleMutation { id }\`;
          const myMutation = mutation;
          commitMutation(environment, {mutation: myMutation});
        `,
        errors: [
          {
            message:
              'The `commitMutation` must be used with an explicit generated Flow type, e.g.: commitMutation<ExampleMutation>(...)',
            line: 4
          }
        ]
      },
      {
        code: `\nrequestSubscription(environemnt, {subscription: graphql\`subscription ExampleSubscription { id }\`})`,
        errors: [
          {
            message:
              'The `requestSubscription` must be used with an explicit generated Flow type, e.g.: requestSubscription<ExampleSubscription>(...)',
            line: 2,
            column: 1
          }
        ]
      },
      {
        code: `
          const subscription = graphql\`subscription ExampleSubscription { id }\`;
          requestSubscription(environment, {subscription});
        `,
        errors: [
          {
            message:
              'The `requestSubscription` must be used with an explicit generated Flow type, e.g.: requestSubscription<ExampleSubscription>(...)',
            line: 3
          }
        ]
      },
      {
        code: `
          const subscription = graphql\`subscription ExampleSubscription { id }\`;
          const mySubscription = subscription;
          requestSubscription(environment, {subscription: mySubscription});
        `,
        errors: [
          {
            message:
              'The `requestSubscription` must be used with an explicit generated Flow type, e.g.: requestSubscription<ExampleSubscription>(...)',
            line: 4
          }
        ]
      }
    ]
  }
);
