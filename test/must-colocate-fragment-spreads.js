/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

'use strict';

var eslint = require('eslint');

const rules = require('..').rules;
const RuleTester = eslint.RuleTester;

const ruleTester = new RuleTester({
  parser: 'babel-eslint',
  parserOptions: {ecmaVersion: 6, sourceType: 'module'}
});

function unusedFieldsWarning(fragment) {
  return (
    `This queries for the fragment \`${fragment}\` but this file does ` +
    'not seem to use it directly. If a different file needs this ' +
    'information that file should export a fragment and colocate ' +
    'the query for the data with the usage.\n'
  );
}

// TODO test unused fragments in queries

ruleTester.run(
  'must-colocate-fragment-spreads',
  rules['must-colocate-fragment-spreads'],
  {
    valid: [
      `
      import { Component } from '../shared/component.js';
      graphql\`fragment foo on Page {
        ...component_fragment
      }\`;
      `,
      `
      import { Component } from './nested/componentModule.js';
      graphql\`fragment foo on Page {
        ...componentModule_fragment @relay(mask: false)
      }\`;
      `,
      `
      import { Component } from './component-module.js';
      graphql\`fragment foo on Page {
        ...componentModuleFragment
      }\`;
      `,
      `
      import { Component } from './component-module.js';
      graphql\`query Root {
        ...componentModuleFragment
      }\`;
      `,
      `
      graphql\`fragment foo1 on Page {
        name
      }\`;
      graphql\`fragment foo2 on Page {
        ...foo1
      }\`;
      `,
      `
      graphql\`mutation {
        page_unlike(data: $input) {
          ...component_fragment
          ...componentFragment
          ...component @relay(mask: false)
        }
      }\`
      `,
      `
      graphql\`fragment foo on Page { ...Fragment @relay(mask: false) }\`;
      `,
      `
      graphql\`fragment foo on Page { ...Fragment @module(name: "ComponentName.react") }\`;
      `
    ],
    invalid: [
      {
        code: `
        graphql\`fragment foo on Page { ...unused1 }\`;
        `,
        errors: [
          {
            message: unusedFieldsWarning('unused1'),
            line: 2
          }
        ]
      },
      {
        code: `
        graphql\`fragment Test on Page { ...unused1, ...unused2 }\`;
        `,
        errors: [unusedFieldsWarning('unused1'), unusedFieldsWarning('unused2')]
      },
      {
        code: `
        graphql\`query Root { ...unused1 }\`;
        `,
        errors: [
          {
            message: unusedFieldsWarning('unused1'),
            line: 2
          }
        ]
      },
      {
        code: `
        import { Component } from './used1.js';
        graphql\`fragment foo on Page { ...used1 ...unused1 }\`;
        `,
        errors: [unusedFieldsWarning('unused1')]
      },
      {
        code: `
        graphql\`fragment foo on Page { ...unused1 @relay(mask: true) }\`;
        `,
        errors: [unusedFieldsWarning('unused1')]
      }
    ]
  }
);
