/*
  Write a function `countVowels` which takes a string as input and returns the count of vowels (both uppercase and lowercase) in the string.

  What are vowels?
  - Vowels are the characters: a, e, i, o, u (case-insensitive).

  Example:
  - Input: "hello world"
  - Output: 3

  - Input: "AEIOUaeiou"
  - Output: 10

  - Input: "xyz"
  - Output: 0

  - Input: ""
  - Output: 0

  Note:
  - The function should count vowels in any alphanumeric string.
  - It should handle empty strings gracefully.

  Once you've implemented the logic, test your code by running
  - `npm run test-countVowels`
*/

function countVowels(str) {
  // The regex approach, which is the idiomatic "built-in" solution this folder
  // is about.
  //
  //   [aeiou]  - a character CLASS: match any single character from this set
  //   g        - global: find every match, not just the first
  //   i        - case-insensitive, which covers 'A' and 'a' in one pattern
  //               instead of writing [aeiouAEIOU]
  const matches = str.match(/[aeiou]/gi);

  // THE critical detail: String.prototype.match returns `null` when there are no
  // matches — NOT an empty array. So `str.match(...).length` throws a TypeError
  // on any vowel-free input like "xyz" or "".
  //
  // `|| []` substitutes an empty array so `.length` is always safe, yielding 0.
  // (`matches?.length ?? 0` is an equally good modern alternative.)
  return (matches || []).length;

  // Both edge cases are handled by that one guard: "xyz" has no matches and ""
  // has nothing to search, so both take the null path and return 0.
  //
  // The explicit-loop alternative (see 01-js/medium/count-vowels.js) avoids the
  // null trap entirely by never calling match(). Either is fine — the point of
  // this version is to know that match() returns null, because that's the sharp
  // edge people cut themselves on.
}

module.exports = { countVowels };
