/*
  Write a function `findLargestElement` that takes an array of numbers and returns the largest element.
  Example:
  - Input: [3, 7, 2, 9, 1]
  - Output: 9
*/

function findLargestElement(numbers) {
  // An empty array has no largest element, so `undefined` is the honest answer.
  // This case must be handled explicitly — see the note at the bottom for why the
  // tempting one-liner alternatives get it wrong.
  if (!Array.isArray(numbers) || numbers.length === 0) {
    return undefined;
  }

  // Seed with the FIRST ELEMENT — not with 0, and not with -Infinity.
  //
  // Seeding with 0 is the classic bug: for [-5, -10, -2, -8] the answer would
  // come back as 0, a value that isn't even in the array. Seeding with the first
  // element guarantees the result is always a genuine member of the input, which
  // is precisely what "largest element" means.
  let largest = numbers[0];

  // Start at index 1 — index 0 is already the reigning champion, so comparing it
  // against itself is wasted work.
  for (let i = 1; i < numbers.length; i++) {
    // One pass, one comparison per element: O(n) time, O(1) extra space.
    if (numbers[i] > largest) {
      largest = numbers[i];
    }
  }

  return largest;

  // Why not the one-liners?
  //
  //   Math.max(...numbers)
  //     - returns -Infinity for [] rather than undefined, and
  //     - spreading a very large array (~100k+ elements) overflows the call
  //       stack, because every element becomes a separate function argument.
  //
  //   numbers.sort((a, b) => b - a)[0]
  //     - O(n log n) instead of O(n), and it MUTATES the caller's array — a
  //       surprising side effect from a function that only claims to read.
  //
  // The plain `>` comparison handles negatives and decimals correctly with no
  // special cases, which is why those test groups pass unaided.
}

module.exports = findLargestElement;
