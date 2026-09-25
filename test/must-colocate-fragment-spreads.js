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
  languageOptions: {
    ecmaVersion: 2022,
    parser: require('@typescript-eslint/parser')
  }
});

const flowRuleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parser: require('@babel/eslint-parser'),
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {presets: ['@babel/preset-flow']}
    }
  }
});

function unusedFieldsWarning(fragment) {
  return (
    `This spreads the fragment \`${fragment}\` but ` +
    'this module does not use it directly. If a different module ' +
    'needs this information, that module should directly define a ' +
    'fragment querying for that data, colocated next to where the ' +
    'data is used.\n'
  );
}

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
      const Component = require('../shared/component.js');
      graphql\`fragment foo on Page {
        ...component_fragment
      }\`;
      `,
      `
      const Component = import('../shared/component.js');
      graphql\`fragment foo on Page {
        ...component_fragment
      }\`;
      `,
      `
      import { Component } from './nested/componentModule.js';
      graphql\`fragment foo on Page {
        ...componentModule_fragment
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
      {
        code: `
        import { StoryCard } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}]
      },
      {
        code: `
        import { useStory } from 'example-ui';
        graphql\`fragment foo on Page {
          ...useStory_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}]
      },
      {
        code: `
        import { StoryCard as Card } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}]
      },
      {
        code: `
        import { "StoryCard" as Card } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}]
      },
      {
        code: `
        import { StoryCard, type StoryCard$key } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}]
      },
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
          ...component
        }
      }\`
      `,
      `
      graphql\`fragment foo on Page { ...Fragment @relay(mask: false) }\`;
      `,
      `
      graphql\`fragment foo on Page { ...Fragment @module(name: "ComponentName.react") }\`;
      `,
      '\
      const getOperation = (reference) => {\
        return import(`./src/__generated__/${reference}`);\
      };\
      ',
      '\
      const getOperation = (reference) => {\
        return import(reference);\
      };\
      ',
      `
      graphql\`fragment foo on Page {
        # eslint-disable-next-line relay/must-colocate-fragment-spreads
        ...unused1
      }\`;
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
      },
      {
        code: `
        import type { MyType } from '../shared/component.js';
        graphql\`fragment foo on Page {
          ...component_fragment
        }\`;
        `,
        errors: [unusedFieldsWarning('component_fragment')]
      },
      {
        code: `
        import { StoryCard } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import { StoryCard } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: false}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import { StoryCard } from '@example/ui/story-card';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import { StoryCard } from './index.js';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import { Other as StoryCard } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import StoryCard from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import * as StoryCard from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import type { StoryCard } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import { type StoryCard, Other } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import { Card } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      }
    ]
  }
);

flowRuleTester.run(
  'must-colocate-fragment-spreads with Flow imports',
  rules['must-colocate-fragment-spreads'],
  {
    valid: [
      {
        code: `
        import { StoryCard, type StoryCard$key } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}]
      }
    ],
    invalid: [
      {
        code: `
        import typeof { StoryCard } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      },
      {
        code: `
        import { typeof StoryCard, Other } from '@example/ui';
        graphql\`fragment foo on Page {
          ...StoryCard_fragment
        }\`;
        `,
        options: [{allowNamedImportsFromPackageRoot: true}],
        errors: [unusedFieldsWarning('StoryCard_fragment')]
      }
    ]
  }
);
