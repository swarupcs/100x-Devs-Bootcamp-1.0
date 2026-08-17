/*
  Write a function `compressWords` which takes an array of strings as input and returns a new array with consecutive duplicate elements compressed. If an element appears consecutively, it is replaced by the element followed by the count of its occurrences.

  Example:
  - Input: ["apple", "apple", "banana", "banana", "banana", "cherry", "apple", "apple"]
  - Output: ["apple2", "banana3", "cherry", "apple2"]

  - Input: ["cat", "dog", "dog", "dog", "cat"]  -> ["cat", "dog3", "cat"]
  - Input: ["one", "two", "three"]              -> ["one", "two", "three"]
  - Input: []                                   -> []

  Note:
  - The function should handle empty arrays and arrays with no consecutive duplicates.

  Once you've implemented the logic, test your code by running
  - `npm run test-compressWord`
*/

function compressWords(arr) {
  // Run-length encoding again (see stringCompression.js), but over ARRAY
  // ELEMENTS rather than characters. The algorithm is identical — which is the
  // real lesson here: once you recognise the shape, the element type is just a
  // detail.
  //
  // CONSECUTIVE is still the operative word. Look at the first example: "apple"
  // appears four times in total, but as two separate runs of two, separated by
  // the bananas and the cherry. So it produces "apple2" TWICE rather than a
  // single "apple4". A frequency map would get this wrong; adjacency is what
  // matters.

  if (arr.length === 0) return [];

  const result = [];

  let currentWord = arr[0];
  let runLength = 1;

  for (let i = 1; i < arr.length; i++) {
    if (arr[i] === currentWord) {
      // The run continues.
      runLength++;
    } else {
      // Run broken — emit the completed one and start fresh from this element.
      result.push(formatRun(currentWord, runLength));
      currentWord = arr[i];
      runLength = 1;
    }
  }

  // Emit the FINAL run.
  //
  // This line outside the loop is the classic trap in run-length encoding: the
  // last run has no following element to trigger the "run ended" branch above,
  // so omitting this would silently drop the trailing group entirely (the first
  // example would lose its final "apple2").
  result.push(formatRun(currentWord, runLength));

  return result;
}

// A single occurrence is emitted bare, with no "1" suffix — that's why "cherry"
// stays "cherry" while "banana" becomes "banana3".
//
// Note this uses ===, so comparison is exact and case-sensitive: "Apple" and
// "apple" are different words and would not merge into one run.
function formatRun(word, length) {
  return length === 1 ? word : word + length;
}

module.exports = compressWords;
