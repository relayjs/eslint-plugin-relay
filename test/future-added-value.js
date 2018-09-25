/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

var eslint = require('eslint');

const rules = require('..').rules;
const RuleTester = eslint.RuleTester;

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
  parserOptions: {ecmaVersion: 6, sourceType: 'module'}
});

const FUTURE_ADDED_VALUE_MESSAGE =
  "Do not use `'%future added value'`. It represents any potential " +
  'value that the server might return in the future that the code ' +
  'should handle.';

ruleTester.run('no-future-added-value', rules['no-future-added-value'], {
  valid: [
    `const response: 'YES' | 'NO' = 'YES';`,
    `
      const response: 'YES' | 'NO' = 'YES';
      switch (response) {
        case 'YES':
          break;
        case 'NO':
          break;
        default:
          (response: '%future added value');
      }
    `
  ],
  invalid: [
    {
      // value location
      code: `const response: 'YES' | 'NO' = '%future added value';`,
      errors: [
        {
          message: FUTURE_ADDED_VALUE_MESSAGE
        }
      ]
    },
    {
      // type location
      code: `function test(x: 'EXAMPLE'|'%future added value'){ }`,
      errors: [
        {
          message: FUTURE_ADDED_VALUE_MESSAGE
        }
      ]
    },
    {
      code: `
        const response: 'YES' | 'NO' = 'YES';
        switch (response) {
          case 'YES':
            break;
          case 'NO':
            break;
          case '%future added value':
            break;
          default:
            (response: '%future added value');
        }
      `,
      errors: [
        {
          message: FUTURE_ADDED_VALUE_MESSAGE
        }
      ]
    },
    {
      // using future added value not in typecasting
      code: `
        const response: 'YES' | 'NO' = 'YES';
        switch (response) {
          case 'YES':
            break;
          case 'NO':
            break;
          default:
            const foo = '%future added value';
        }
      `,
      errors: [
        {
          message: FUTURE_ADDED_VALUE_MESSAGE
        }
      ]
    }
  ]
});
