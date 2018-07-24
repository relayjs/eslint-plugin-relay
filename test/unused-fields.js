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

function unusedFieldsWarning(field) {
  return (
    `This queries for the field \`${field}\` but this file does ` +
    'not seem to use it directly. If a different file needs this ' +
    'information that file should export a fragment and colocate ' +
    'the query for the data with the usage.'
  );
}

ruleTester.run('unused-fields', rules['unused-fields'], {
  valid: [
    `
      graphql\`fragment foo on Page { name2 }\`;
      props.page.name;
      foo.name2;
    `,
    `
      graphql\`fragment Test on InternalTask {
        owner: task_owner {
          name: full_name
        }
      }\`;
      node.owner.name;
    `,
    'graphql`fragment Test on Page { ...Other_x }`;',
    `
      const {
        normal,
        aliased: v1,
        [computed]: x,
        nested: { v2 },
        ...rest
      } = foo;
    `,
    'graphql`mutation { page_unlike(data: $input) }`',
    'String.raw`foo bar`',
    `
      graphql\`
        fragment foo on Page {
          page_info {
             has_next_page
             has_previous_page
             end_cursor
             start_cursor
          }
        }
      \`;
    `
  ],
  invalid: [
    {
      code: `
        graphql\`
          fragment Test on Page {
            name
            name2
          }
        \`;
        props.page.name;
      `,
      errors: [
        {
          message: unusedFieldsWarning('name2'),
          line: 5
        }
      ]
    },
    {
      code: `
        graphql\`fragment Test on Page { unused1, unused2 }\`;
      `,
      errors: [unusedFieldsWarning('unused1'), unusedFieldsWarning('unused2')]
    },
    {
      code: `
        const getByPath = require('getByPath');
        graphql\`fragment Test on Page { unused1, used1, used2 }\`;
        alert(getByPath(obj, ['foo', 'used1', 'used2']))
      `,
      errors: [unusedFieldsWarning('unused1')]
    },
    {
      code: `
        graphql\`fragment Test on Page { unused1, used1, used2 }\`;
        obj?.foo?.used1?.used2;
      `,
      errors: [unusedFieldsWarning('unused1')]
    },
    {
      code: `
        const dotAccess = require('dotAccess');
        graphql\`fragment Test on Page { unused1, used1, used2 }\`;
        alert(dotAccess(obj, 'foo.used1.used2'))
      `,
      errors: [unusedFieldsWarning('unused1')]
    },
    {
      code: `
        graphql\`fragment Test on Page {
          unused1
          unused2
          used1
          used2
          used3
          used4
        }\`;
        var { used1: unused1, used2: {used3} } = node;
        function test({used4}) {
          return x;
        }
      `,
      errors: [
        {
          message: unusedFieldsWarning('unused1'),
          line: 3
        },
        {
          message: unusedFieldsWarning('unused2'),
          line: 4
        }
      ]
    }
  ]
});
