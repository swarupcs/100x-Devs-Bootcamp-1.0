/*
  Write a function `getUniqueElements` which takes an array as input and returns a new array containing only the unique elements from the input array.

  What are unique elements?
  - Elements that appear only once in the array or the first occurrence of each element in case of duplicates.

  Example:
  - Input: [10, 20, 30, 10, 40, 20]  -> [10, 20, 30, 40]
  - Input: [1, 2, 3, 4, 5]           -> [1, 2, 3, 4, 5]
  - Input: []                        -> []

  Once you've implemented the logic, test your code by running
  - `npm run test-unique`
*/

function getUniqueElements(arr) {
  // Read the definition carefully — it says the FIRST OCCURRENCE of each element
  // is kept. So this is deduplication, not "keep only the values that appear
  // exactly once". [10, 20, 30, 10, 40, 20] yields [10, 20, 30, 40]: 10 and 20
  // are retained (at their first positions), not discarded for being repeats.
  //
  // A Set is exactly the right data structure: it stores each distinct value at
  // most once, and — importantly — it preserves INSERTION ORDER when iterated.
  // That ordering guarantee is what keeps first-occurrence positions intact.
  //
  // The spread operator then converts the Set back into a plain array, since the
  // function must return an array.
  return [...new Set(arr)];

  // Why a Set and not `arr.filter((v, i) => arr.indexOf(v) === i)`:
  //
  //   - PERFORMANCE. indexOf rescans the array for every element, so the filter
  //     version is O(n²). Set membership is hash-based, making this O(n).
  //
  //   - CORRECT EQUALITY. Sets use SameValueZero comparison. The practical
  //     difference from indexOf's strict === is NaN: NaN !== NaN, so indexOf can
  //     never find a NaN and the filter version would keep every duplicate NaN.
  //     A Set correctly treats them as one value.
  //
  // What a Set does NOT do is coerce types. 1 and '1' are distinct values, so
  // [1, '1', 1, 2, '2', '2'] correctly yields [1, '1', 2, '2'] — the number and
  // the string both survive. This is exactly where a plain object used as a
  // lookup would fail, since object keys are always coerced to strings and the
  // two would collide into one.
  //
  // One genuine limitation: Sets compare objects by REFERENCE, not by contents.
  // [{a: 1}, {a: 1}] contains two distinct references and so passes through
  // unchanged. Deduplicating by value requires a key function — e.g. keeping a
  // Set of JSON.stringify(item) — which is a different (and much slower) job.
}

module.exports = getUniqueElements;
