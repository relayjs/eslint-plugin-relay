/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { Rule, Linter } from 'eslint';

declare const plugin: {
  rules: {
    'graphql-syntax': Rule.RuleModule;
    'graphql-naming': Rule.RuleModule;
    'generated-typescript-types': Rule.RuleModule;
    'no-future-added-value': Rule.RuleModule;
    'unused-fields': Rule.RuleModule;
    'must-colocate-fragment-spreads': Rule.RuleModule;
    'function-required-argument': Rule.RuleModule;
    'hook-required-argument': Rule.RuleModule;
  };
  configs: {
    recommended: Linter.LegacyConfig;
    'ts-recommended': Linter.LegacyConfig;
    strict: Linter.LegacyConfig;
    'ts-strict': Linter.LegacyConfig;
  };
};

export = plugin;
