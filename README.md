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
    'relay/graphql-naming': 'error',
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

### Rule Descriptions

Brief descriptions for each rule:

- `relay/graphql-syntax`: Ensures each `graphql\`\`` tagged template literal contains syntactically valid GraphQL. This is also validated by the Relay Compiler, but the ESLint plugin can often provide faster feedback.
- `relay/graphql-naming`: Ensures GraphQL fragments and quries follow Relay's naming conventions. This is also validated by the Relay Compiler, but the ESLint plugin can often provide faster feedback.
- `relay/must-colocate-fragment-spreads`: Ensures that when a fragment spread is added within a module, that module directly imports the module which defines that fragment. This prevents the anit-pattern when one component fetches a fragment that is not used by a direct child component. **Note**: This rule leans heavily on Meta's globally unique module names. It likely won't work well in other environments.
- `relay/no-future-added-value`: Ensures code does not try to explicly handle the `"%future added value"` typename which Relay inserts as a placeholder for types that might be added to the schema while your app is deployed.
- `relay/unused-fields`: Ensures that every GraphQL field that is fetched is used within the module that includes it. This helps enable Relay's [optimal data fetching](https://relay.dev/blog/2023/10/24/how-relay-enables-optimal-data-fetching/)
- `relay/function-required-argument`: Ensures that `readInlineData` is always passed an explict argument even though that argument is allowed to be `undefined` at runtime.
- `relay/hook-required-argument`: Ensures that Relay hooks are always passed an explict argument even though that argument is allowed to be `undefined` at runtime.

Haste?

- `relay/must-colocate-fragment-spreads`: Ensures that for every fragment spread, the module that defines that fragment is imported.

### Suppressing rules within graphql tags

The following rules support suppression within graphql tags:

- relay/unused-fields
- relay/must-colocate-fragment-spreads

Supported rules can be suppressed by adding `# eslint-disable-next-line relay/name-of-rule` to the preceding line:

```js
graphql`
  fragment foo on Page {
    # eslint-disable-next-line relay/must-colocate-fragment-spreads
    ...unused1
  }
`;
```

Note that only the `eslint-disable-next-line` form of suppression works. `eslint-disable-line` doesn't currently work until graphql-js provides support for [parsing Comment nodes](https://github.com/graphql/graphql-js/issues/2241) in their AST.

## Contribute

We actively welcome pull requests, learn how to [contribute](./CONTRIBUTING.md).

## License

`eslint-plugin-relay` is [MIT licensed](./LICENSE).
