/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

const rules = require('..').rules;
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 6,
    parser: require('@typescript-eslint/parser')
  }
});

ruleTester.run('hook-required-argument', rules['hook-required-argument'], {
  valid: [
    {
      code: `
       import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
       useFragment(graphql\`fragment TestFragment_foo on User { id }\`, ref)
     `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useRefetchableFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`, ref)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`, ref)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useBlockingPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`, ref)
      `
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useLegacyPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`, ref)
      `
    }
  ],
  invalid: [
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useFragment(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      errors: [
        {
          message:
            'A fragment reference should be passed to the `useFragment` hook',
          line: 3
        }
      ]
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        usePaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      errors: [
        {
          message:
            'A fragment reference should be passed to the `usePaginationFragment` hook',
          line: 3
        }
      ]
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useBlockingPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      errors: [
        {
          message:
            'A fragment reference should be passed to the `useBlockingPaginationFragment` hook',
          line: 3
        }
      ]
    },
    {
      code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        useLegacyPaginationFragment<PaginationQuery, _>(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
      errors: [
        {
          message:
            'A fragment reference should be passed to the `useLegacyPaginationFragment` hook',
          line: 3
        }
      ]
    }
  ]
});
