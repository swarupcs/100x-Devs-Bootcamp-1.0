/*
  Implement a function `countVowels` that takes a string as an argument and returns the number of vowels in the string.
  Note: Consider both uppercase and lowercase vowels ('a', 'e', 'i', 'o', 'u').

  Once you've implemented the logic, test your code by running
  - `npm run test-count-vowels`
*/

function countVowels(str) {
  // A Set gives O(1) membership tests. With only five members the practical
  // difference against `"aeiou".includes(char)` is negligible, but the Set also
  // reads as a declaration of intent: this is the fixed alphabet we care about.
  const VOWELS = new Set(["a", "e", "i", "o", "u"]);

  let count = 0;

  // `for...of` iterates a string by CODE POINT rather than by UTF-16 code unit,
  // so characters outside the Basic Multilingual Plane (emoji, some CJK) arrive
  // whole instead of split into surrogate halves. Irrelevant for the ASCII test
  // cases, but it's the habit that avoids a nasty class of string bugs.
  for (const char of str) {
    // Normalise case at the point of comparison instead of lowercasing the whole
    // string up front. Same result, but it avoids allocating a second copy of
    // the input — which matters if the string is large.
    if (VOWELS.has(char.toLowerCase())) {
      count++;
    }
  }

  return count;

  // Non-letters need no special handling. Spaces, digits, and punctuation simply
  // fail the membership test and are skipped, which is why 'Hello, world!' → 3
  // and 'a e i o u' → 5 both work without extra code.
  //
  // An empty string yields 0 naturally: the loop body never executes.
  //
  // A tidy one-line alternative:
  //     return (str.match(/[aeiou]/gi) || []).length;
  // It's shorter, but note the `|| []` is mandatory — String.match returns
  // `null` (not an empty array) when nothing matches, so the naive version
  // throws on any vowel-free input. The explicit loop sidesteps that trap.
}

module.exports = countVowels;
