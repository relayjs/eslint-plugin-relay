# Contributing to eslint-plugin-relay

`eslint-plugin-relay` is one of Facebook's open source projects that is both under very active development and is also being used to ship code to everybody on [facebook.com](https://www.facebook.com). We're still working out the kinks to make contributing to this project as easy and transparent as possible, but we're not quite there yet. Hopefully this document makes the process for contributing clear and answers some questions that you may have.

## [Code of Conduct](https://code.facebook.com/codeofconduct)

Facebook has adopted a Code of Conduct that we expect project participants to adhere to. Please read [the full text](https://code.facebook.com/codeofconduct) so that you can understand what actions will and will not be tolerated.

## Our Development Process

Unlike Relay, this project is developed directly and exclusively on GitHub. We intend to release updates quickly after changes are merged.

### Pull Requests

_Before_ submitting a pull request, please make sure the following is done…

1. Fork the repo and create your branch from `master`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes (`yarn test` or `npm test`).
4. Auto-format the code by running `yarn run prettier` or `npm run prettier`.
5. If you haven't already, complete the CLA.

### Package Publishing

- Every change that gets pushed to the `main` branch will be published as `0.0.0-main-SHA`.
- For stable releases, the release author is expected to update the version in `package.json`, commit that, and create an accompanying tag. Once this is pushed a package will be published following that version. The workflow would look something like this:

  ```bash
  $ yarn version --minor
  $ git push --follow-tags
  ```

### Contributor License Agreement (CLA)

In order to accept your pull request, we need you to submit a CLA. You only need to do this once, so if you've done this for another Facebook open source project, you're good to go. If you are submitting a pull request for the first time, just let us know that you have completed the CLA and we can cross-check with your GitHub username.

[Complete your CLA here.](https://code.facebook.com/cla)

## Bugs & Questions

We will be using GitHub Issues bugs and feature requests. Before filing a new issue, make sure an issue for your problem doesn't already exist.

## License

By contributing to `eslint-plugin-relay`, you agree that your contributions will be licensed under its MIT license.
