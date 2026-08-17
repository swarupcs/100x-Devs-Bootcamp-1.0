/*
  Write a function `reverseInteger` which takes an integer as input and returns the integer with its digits reversed. If the input is negative, the reversed integer should also be negative.

  What is reversing an integer?
  - Reversing an integer means rearranging its digits in the opposite order while maintaining its sign.

  Example:
  - Input: 123   -> 321
  - Input: -456  -> -654
  - Input: 100   -> 1
  - Input: 0     -> 0

  Once you've implemented the logic, test your code by running
  - `npm run test-reverseInteger`
*/

function reverseInteger(num) {
  // Remember the sign, then work with the magnitude only.
  //
  // Separating the sign up front is what keeps the string manipulation clean: if
  // we reversed "-456" directly we'd get "654-", which is not a number at all.
  // Math.sign returns -1, 0, or 1.
  const sign = Math.sign(num);
  const digits = Math.abs(num).toString();

  // The familiar three-step string reversal: explode to characters, reverse the
  // array in place, glue back together.
  const reversedDigits = digits.split("").reverse().join("");

  // Number() converts back and, crucially, DROPS LEADING ZEROS for free.
  //
  // That's what makes the 1200 case work: reversing gives the string "0021",
  // and Number("0021") is 21 — exactly the expected answer. Handling that by
  // hand (stripping zeros in a loop) is a common source of off-by-one bugs, so
  // it's worth recognising that the numeric conversion already does it.
  const reversedNumber = Number(reversedDigits);

  // Reattach the sign. Multiplying is neater than an if/else and handles all
  // three cases uniformly:
  //   -1 * 654 = -654
  //    1 * 321 =  321
  //    0 *   0 =    0   (0 is neither positive nor negative, and -0 * 0 is 0)
  return sign * reversedNumber;

  // On 0: Math.abs(0).toString() is "0", reversed is still "0", Number gives 0,
  // and Math.sign(0) is 0 — so 0 * 0 = 0. No special case needed.
  //
  // Worth knowing for the LeetCode version of this problem: it asks you to
  // return 0 when the reversed value overflows a signed 32-bit integer. That
  // constraint doesn't apply here, but it's the reason the classic solution
  // often uses arithmetic (result = result * 10 + num % 10) instead of strings —
  // it can check for overflow at each step. The string approach is clearer when
  // overflow isn't a concern.
}

module.exports = reverseInteger;
