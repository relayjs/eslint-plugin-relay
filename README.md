# eslint-plugin-relay [![Build Status](https://travis-ci.org/relayjs/eslint-plugin-relay.svg?branch=master)](https://travis-ci.org/relayjs/eslint-plugin-relay) [![npm version](https://badge.fury.io/js/eslint-plugin-relay.svg)](http://badge.fury.io/js/eslint-plugin-relay)

`eslint-plugin-relay` is a plugin for [ESLint](http://eslint.org/) to catch common problems in code using [Relay](https://facebook.github.io/relay/) early.

## Install

`npm i --save-dev eslint-plugin-relay`

## How To Use

1.  Add `"relay"` to your eslint `plugins` section.
2.  Add the relay rules such as `"relay/graphql-syntax": "error"` to your eslint `rules` section, see the example for all rules.

Example .eslintrc.js:

```js
module.exports = {
  // Other eslint properties here
  rules: {
    'relay/graphql-syntax': 'error',
    'relay/compat-uses-vars': 'warn',
    'relay/graphql-naming': 'error',
    'relay/generated-flow-types': 'warn',
    'relay/must-colocate-fragment-spreads': 'warn',
    'relay/no-future-added-value': 'warn',
    'relay/unused-fields': 'warn',
    'relay/function-required-argument': 'warn',
    'relay/hook-required-argument': 'warn'
  },
  plugins: ['relay']
};
```

You can also enable all the recommended or strict rules at once.
Add `plugin:relay/recommended` or `plugin:relay/strict` in `extends`:

```js
{
  "extends": [
    "plugin:relay/recommended"
  ]
}
```

### Suppressing rules within graphql tags

The following rules support suppression within graphql tags:

- relay/unused-fields
- relay/must-colocate-fragment-spreads

Supported rules can be suppressed by adding `# eslint-disable-next-line relay/name-of-rule` to the preceding line:

```js
graphql`fragment foo on Page {
  # eslint-disable-next-line relay/must-colocate-fragment-spreads
  ...unused1
}`
```

Note that only the `eslint-disable-next-line` form of suppression works. `eslint-disable-line` doesn't currently work until graphql-js provides support for [parsing Comment nodes](https://github.com/graphql/graphql-js/issues/2241) in their AST.

## Contribute

We actively welcome pull requests, learn how to [contribute](./CONTRIBUTING.md).

## License

`eslint-plugin-relay` is [MIT licensed](./LICENSE).
