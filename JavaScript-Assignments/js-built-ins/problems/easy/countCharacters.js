/*
  Write a function `countCharacters` which takes a string as input and returns an object representing the frequency of each character in the string.

  Example:
  - Input: "hello"
  - Output: { h: 1, e: 1, l: 2, o: 1 }

  - Input: "aabbcc"
  - Output: { a: 2, b: 2, c: 2 }

  - Input: ""
  - Output: {}

  Note:
  - The function should count all characters, including spaces and special characters.
  - The function should handle empty strings gracefully.

  Once you've implemented the logic, test your code by running
  - `npm run test-countChar`
*/

const countCharacters = (statement) => {
  // The frequency-map pattern applied to characters: one pass over the input
  // builds a "character -> count" lookup, O(n) time.
  const result = {};

  for (let i = 0; i < statement.length; i++) {
    // charAt(i) and statement[i] are equivalent for in-range indices. charAt
    // returns "" for an out-of-range index where bracket access gives undefined,
    // but the loop bound makes that moot here.
    const char = statement.charAt(i);

    if (result[char]) {
      // Already seen — bump the tally.
      result[char]++;
    } else {
      // First sighting. This branch is doing essential work: `undefined++`
      // produces NaN, and once a count becomes NaN it stays NaN forever (NaN + 1
      // is NaN), silently corrupting that character's tally for the rest of the
      // run. Initialising to 1 explicitly avoids that.
      //
      // The compact equivalent is `result[char] = (result[char] || 0) + 1`,
      // which folds both branches into one line for the same reason.
      result[char] = 1;
    }
  }

  return result;

  // No character is filtered out, so spaces and punctuation get counted too —
  // which is exactly what the note asks for. An empty string skips the loop
  // entirely and returns {}.
  //
  // One caveat inherited from using a plain object: every key is coerced to a
  // string, and the object carries Object.prototype. A string containing
  // "constructor" would still work for counting (assignment shadows the
  // inherited property), but `if (result[char])` on an untouched key like
  // "constructor" would read the INHERITED function and take the wrong branch.
  // Object.create(null) or a Map avoids that class of bug entirely — worth
  // reaching for when the keys come from untrusted input.
};

module.exports = countCharacters;
