// @flow
var leftPad = require('left-pad');
var reverse = require('./reverse');

var rightPad = function rightPad(
  // str/*: string*/,
  str/*::?: string*/,
  len/*: number*/,
  ch/*::?: string | number*/
) /*: string*/ {
  return reverse(leftPad(reverse(str), len, ch));
};

module.exports = rightPad;
