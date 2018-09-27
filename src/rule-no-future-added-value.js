/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

module.exports = context => {
  function validateValue(node) {
    context.report(
      node,
      "Do not use `'%future added value'`. It represents any potential " +
        'value that the server might return in the future that the code ' +
        'should handle.'
    );
  }
  return {
    "Literal[value='%future added value']": validateValue,

    // StringLiteralTypeAnnotations that are not children of a default case
    ":not(SwitchCase[test=null] StringLiteralTypeAnnotation)StringLiteralTypeAnnotation[value='%future added value']": validateValue
  };
};
