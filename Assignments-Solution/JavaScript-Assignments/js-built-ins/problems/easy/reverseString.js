/*
  Write a function `reverseString` which takes a string as input and returns the reversed version of the string.

  What is reversing a string?
  - Reversing a string means rearranging its characters in the opposite order.

  Example:
  - Input: "Sumana"
  - Output: "anamuS"

  - Input: "hello"
  - Output: "olleh"

  - Input: ""
  - Output: ""

  Once you've implemented the logic, test your code by running
  - `npm run test-reverseString`
*/

function reverseString(str) {
  // The three-step built-in idiom. Strings in JavaScript are IMMUTABLE and have
  // no .reverse() method of their own, so we borrow the array's:
  //
  //   1. split("")  - explode the string into an array of single characters
  //   2. reverse()  - reverse the array IN PLACE (this is why we need our own
  //                   array first; reversing a shared one would be a side effect)
  //   3. join("")   - glue the characters back into a string
  //
  // The empty-string case needs no special handling: "".split("") gives [], and
  // [].reverse().join("") gives "" back.
  return str.split("").reverse().join("");

  // Worth knowing where this breaks: split("") splits by UTF-16 CODE UNIT, not
  // by user-perceived character. Characters outside the Basic Multilingual Plane
  // (most emoji, some CJK) are stored as a surrogate PAIR of two code units, so
  // reversing splits the pair and corrupts the character.
  //
  // The fix is to iterate by code point instead:
  //     [...str].reverse().join("")
  // The spread operator uses the string iterator, which keeps surrogate pairs
  // intact. (Even that doesn't handle combining accents or emoji built from ZWJ
  // sequences — full grapheme-correct reversal needs Intl.Segmenter.)
  //
  // For the ASCII inputs here all versions agree, but the difference is worth
  // carrying: it's a classic interview follow-up.
}

module.exports = reverseString;
