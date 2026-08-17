/*
  Write a function `isAnagram` which takes 2 parameters and returns true/false if those are anagrams or not.
  What's Anagram?
  - A word, phrase, or name formed by rearranging the letters of another, such as spar, formed from rasp.

  Once you've implemented the logic, test your code by running
  - `npm run test-anagram`
*/

function isAnagram(str1, str2) {
  // Early exit on differing lengths. This is not merely an optimisation — it's a
  // genuine short-circuit, because two strings built from the same multiset of
  // characters MUST have the same length. It skips the sort entirely for the
  // common "obviously not an anagram" case.
  if (str1.length !== str2.length) {
    return false;
  }

  // The canonical-form trick: two strings are anagrams exactly when their sorted
  // character sequences are identical. Sorting collapses every possible ordering
  // of the same letters into ONE representative form, so comparing the canonical
  // forms answers the question directly.
  //
  // Note what is deliberately NOT stripped: spaces and punctuation count as
  // ordinary characters. That matches the tests — 'Debit Card'/'Bad Credit'
  // passes because both contain exactly one space, and 'hello'/'hello!'
  // correctly fails because the '!' has no partner.
  function sortString(str) {
    return (
      str
        // Case-fold FIRST, so 'School MASTER' and 'The ClassROOM' compare equal.
        // Sorting before lowercasing would break: uppercase letters sort before
        // lowercase ones in Unicode order ('Z' < 'a'), so 'Abc' and 'abC' would
        // produce different sequences despite being anagrams.
        .toLowerCase()
        // Strings are immutable and have no .sort(), so we round-trip through an
        // array.
        .split("")
        // The default comparator sorts by string value, which is exactly right
        // for single characters — no numeric-comparator surprises here.
        .sort()
        .join("")
    );
  }

  return sortString(str1) === sortString(str2);

  // Complexity: O(n log n), dominated by the sort. A frequency-map approach
  // (count each char of str1, decrement for str2, verify all counts hit zero)
  // would be O(n) and is the better answer for very large inputs — but this
  // version is short, obviously correct, and plenty fast for words and phrases.
}

module.exports = isAnagram;
