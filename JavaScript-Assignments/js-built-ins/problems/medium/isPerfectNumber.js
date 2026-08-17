/*
  Write a function `isPerfectNumber` which takes an integer `num` as input and returns a boolean indicating whether the number is a perfect number.

  What is a perfect number?
  - A perfect number is a positive integer that is equal to the sum of its proper divisors, excluding the number itself.

  Example:
  - Input: 6   -> true   (1 + 2 + 3 = 6)
  - Input: 28  -> true   (1 + 2 + 4 + 7 + 14 = 28)
  - Input: 10  -> false  (1 + 2 + 5 = 8)
  - Input: 1   -> false  (no proper divisors)

  Once you've implemented the logic, test your code by running
  - `npm run test-perfect`
*/

function isPerfectNumber(num) {
  // Perfect numbers are defined only for positive integers, and 1 is explicitly
  // excluded: its only divisor is itself, so the set of PROPER divisors is empty
  // and sums to 0 ≠ 1.
  //
  // Guarding here rather than letting the loop handle it also keeps 0 and
  // negatives from producing nonsense.
  if (!Number.isInteger(num) || num <= 1) {
    return false;
  }

  // Every number > 1 has 1 as a proper divisor, so we can seed the sum with it
  // and start the search at 2. This also lets the loop below skip the special
  // case where i and num/i would both need excluding.
  let sum = 1;

  // Only iterate up to the SQUARE ROOT of num — this is the key optimisation.
  //
  // Divisors always come in pairs that multiply to num: for 28 the pairs are
  // (1, 28), (2, 14), (4, 7). One member of each pair is always <= sqrt(num) and
  // the other >= sqrt(num). So finding the small one gives us the large one for
  // free, and we never need to look past sqrt(num).
  //
  // That turns an O(n) scan into O(sqrt(n)) — for 10,000 it's 100 iterations
  // instead of 10,000.
  for (let i = 2; i * i <= num; i++) {
    if (num % i === 0) {
      // `i` divides num, so record it...
      sum += i;

      // ...and record its partner too. The guard matters for perfect squares:
      // when num = 16 and i = 4, the partner num/i is also 4, and adding it
      // twice would inflate the sum. (i * i !== num means "these are two
      // distinct divisors".)
      const partner = num / i;
      if (partner !== i) {
        sum += partner;
      }
    }
  }

  // "Perfect" means the proper divisors sum to exactly the number itself.
  // (For the curious: sum < num is "deficient", sum > num is "abundant". Perfect
  // numbers are vanishingly rare — 6, 28, 496, 8128, then 33,550,336.)
  return sum === num;

  // Note `i * i <= num` is used instead of `i <= Math.sqrt(num)`. Both work, but
  // integer multiplication avoids a floating-point square root and the
  // rounding-at-the-boundary questions that come with it.
}

module.exports = { isPerfectNumber };
