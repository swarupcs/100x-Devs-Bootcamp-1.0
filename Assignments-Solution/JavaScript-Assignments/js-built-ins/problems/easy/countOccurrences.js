/*
  Write a function `countOccurrences` which takes an array as input and returns an object representing the frequency of each element in the array.

  What is frequency?
  - The frequency of an element is the number of times it appears in the array.

  Example:
  - Input: [10, 20, 10, 30, 20, 20]
  - Output: { 10: 2, 20: 3, 30: 1 }

  - Input: [1, 2, 3, 1, 2, 1]
  - Output: { 1: 3, 2: 2, 3: 1 }

  - Input: []
  - Output: {}

  Once you've implemented the logic, test your code by running
  - `npm run test-occurrences`
*/

function countOccurrences(arr) {
  // The frequency-map pattern — one of the most reusable shapes in programming.
  // A single pass builds a lookup of "value -> how many times seen", turning
  // what would be a nested O(n²) scan into O(n).
  const counts = {};

  for (const element of arr) {
    // Read the current tally, defaulting to 0 the first time we meet a value,
    // then store it back incremented.
    //
    // `|| 0` is doing real work here: `counts[element]` is `undefined` on first
    // sight, and `undefined + 1` evaluates to NaN — which would then stay NaN
    // forever, since NaN + 1 is still NaN. That silent corruption is the single
    // most common bug in hand-written frequency counters.
    counts[element] = (counts[element] || 0) + 1;
  }

  return counts;

  // A detail worth understanding about the output: object keys are ALWAYS
  // strings. The number 10 becomes the key "10", which is why the expected
  // result is written as { 10: 2 } and compares equal — JavaScript coerces the
  // numeric literal in the object literal to a string key too.
  //
  // That coercion has a real consequence: the number 1 and the string "1" would
  // collide into a single key here. If distinguishing them matters, use a Map,
  // which preserves key types (see uniqueElements.js, where exactly that
  // distinction is required).
  //
  // An empty array needs no special case — the loop never runs and we return {}.
}

module.exports = countOccurrences;
