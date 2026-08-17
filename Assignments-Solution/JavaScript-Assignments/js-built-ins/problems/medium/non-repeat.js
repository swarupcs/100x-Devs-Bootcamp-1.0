/*
  Write a function `nonrepeat` which takes a string as input and returns the first non-repeating character in the string.

  What is a non-repeating character?
  - A character that appears only once in the entire string.

  Example:
  - Input: "abcab"   -> "c"
  - Input: "aabbcc"  -> null
  - Input: "abcdef"  -> "a"
  - Input: ""        -> null

  Once you've implemented the logic, test your code by running
  - `npm run test-nonrepeat`
*/

function nonrepeat(str) {
  // TWO PASSES are required here, and understanding why is the whole lesson.
  //
  // You cannot decide on a single pass whether the character at index 0 is
  // unique — a copy of it might appear at the very end of the string. So the
  // first pass gathers complete knowledge (how many times does each character
  // occur?), and only then can the second pass answer the question.

  // --- Pass 1: build the frequency map --------------------------------------
  // A Map rather than a plain object, for two reasons that matter with arbitrary
  // input: no inherited prototype keys to collide with (a literal "constructor"
  // character sequence can't confuse us), and keys keep their exact identity.
  const counts = new Map();

  for (const char of str) {
    counts.set(char, (counts.get(char) || 0) + 1);
  }

  // --- Pass 2: scan in ORIGINAL order and return the first singleton ---------
  // The order of this loop is what makes the answer "first" rather than merely
  // "some". We deliberately re-walk the STRING, not the Map — even though a Map
  // preserves insertion order and would happen to work here, iterating the
  // string states the intent directly: report them in the order they appear.
  for (const char of str) {
    if (counts.get(char) === 1) {
      return char;
    }
  }

  // Fell through: every character repeats (or the string was empty). The tests
  // require `null` specifically — a deliberate "we searched and found nothing",
  // as opposed to `undefined`, which is what JavaScript returns when you simply
  // fall off the end of a function.
  return null;

  // Complexity: O(n) time, O(k) space where k is the number of distinct
  // characters. Compare the naive approach — for each character, scan the whole
  // string looking for another copy — which is O(n²). The frequency map buys
  // linear time for a little memory, which is the trade almost always worth
  // making.
  //
  // Note `for...of` iterates by code point, so spaces and punctuation are
  // treated as ordinary characters (which is why 'a b a' correctly yields 'b',
  // the space having appeared twice).
}

module.exports = nonrepeat;
