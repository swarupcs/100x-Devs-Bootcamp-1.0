/*
  Write a function `findDuplicates` which takes an array as input and returns an array containing all the duplicate elements.

  What are duplicates?
  - Elements that appear more than once in the array are considered duplicates.

  Example:
  - Input: [10, 20, 30, 10, 40]
  - Output: [10]

  - Input: [1, 2, 3, 4, 5]
  - Output: []

  - Input: []
  - Output: []

  Once you've implemented the logic, test your code by running
  - `npm run test-duplicates`
*/

function findDuplicates(arr) {
  // The "first-index" trick, and it's genuinely elegant once it clicks.
  //
  // arr.indexOf(ele) always reports the index of the FIRST occurrence of a
  // value. So for any element, compare where it actually sits against where its
  // first occurrence sits:
  //
  //   indexOf(ele) === index  ->  this IS the first occurrence -> not a duplicate
  //   indexOf(ele) !== index  ->  an identical value appeared earlier -> duplicate
  //
  // Walking [10, 20, 30, 10, 40]:
  //   index 0, 10: indexOf(10) is 0, equal      -> keep out
  //   index 1, 20: indexOf(20) is 1, equal      -> keep out
  //   index 2, 30: indexOf(30) is 2, equal      -> keep out
  //   index 3, 10: indexOf(10) is 0, NOT equal  -> duplicate, include
  //   index 4, 40: indexOf(40) is 4, equal      -> keep out
  // Result: [10]
  //
  // A useful property of this formulation: a value appearing three times is
  // reported twice (once for each repeat past the first), so the output length
  // tells you how many redundant entries exist, not how many distinct values
  // were repeated. If you instead want each duplicated VALUE listed once, wrap
  // the result: [...new Set(findDuplicates(arr))].
  return arr.filter((ele, index) => arr.indexOf(ele) !== index);

  // Complexity: O(n²), because indexOf performs its own scan for every element.
  // Fine for the small inputs here, but for large arrays prefer a Set-based
  // single pass:
  //
  //     const seen = new Set();
  //     const dupes = [];
  //     for (const ele of arr) {
  //       if (seen.has(ele)) dupes.push(ele);
  //       else seen.add(ele);
  //     }
  //
  // That's O(n) and, as a bonus, uses SameValueZero comparison — so it handles
  // NaN correctly, which indexOf cannot (indexOf uses ===, and NaN !== NaN, so
  // a repeated NaN is never detected by the version above).
}

module.exports = findDuplicates;
