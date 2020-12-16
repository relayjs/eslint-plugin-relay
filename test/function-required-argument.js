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
  parser: require.resolve('babel-eslint'),
  parserOptions: {ecmaVersion: 6, ecmaFeatures: {jsx: true}}
});

ruleTester.run(
  'function-required-argument',
  rules['function-required-argument'],
  {
    valid: [
      {
        code: `
       import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
       readInlineData(graphql\`fragment TestFragment_foo on User { id }\`, ref)
     `
      }
    ],
    invalid: [
      {
        code: `
        import type {TestFragment_foo$key} from 'TestFragment_foo.graphql';
        readInlineData(graphql\`fragment TestFragment_foo on User { id }\`)
      `,
        errors: [
          {
            message:
              'A fragment reference should be passed to the `readInlineData` function',
            line: 3
          }
        ]
      }
    ]
  }
);
