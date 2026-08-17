/*
  Implement a function `isPalindrome` which takes a string as argument and returns true/false as its result.
  Note: the input string is case-insensitive which means 'Nan' is a palindrome as 'N' and 'n' are considered case-insensitive.

  Once you've implemented the logic, test your code by running
  - `npm run test-palindrome`
*/

function isPalindrome(str) {
  // --- Step 1: normalise ----------------------------------------------------
  // A palindrome check is really a question about the SIGNIFICANT characters,
  // so we strip everything that doesn't carry meaning before comparing.
  //
  //   [^a-z0-9]  = "any character that is NOT a letter or digit"
  //   /g         = replace every occurrence, not just the first
  //
  // This is what makes 'A man, a plan, a canal. Panama' and
  // 'Mr. Owl ate my metal worm.' come out true — spaces, commas and full stops
  // are noise for this purpose. Lowercasing first handles the case-insensitivity
  // requirement in the same pass.
  const cleaned = str.toLowerCase().replace(/[^a-z0-9]/g, "");

  // --- Step 2: two-pointer comparison ---------------------------------------
  // Walk inward from both ends simultaneously, comparing mirrored positions.
  let left = 0;
  let right = cleaned.length - 1;

  // The loop condition `left < right` is what makes odd-length strings work
  // without a special case: the pointers meet at the middle character, which is
  // its own mirror and never needs checking.
  while (left < right) {
    // Any mismatched pair disproves the palindrome immediately — no need to
    // examine the rest.
    if (cleaned[left] !== cleaned[right]) {
      return false;
    }
    left++;
    right--;
  }

  return true;

  // Empty and single-character strings return true for free: the loop never runs
  // because `left < right` is false from the start (0 < -1 and 0 < 0).
  //
  // Why two pointers rather than the popular one-liner
  //     cleaned === cleaned.split('').reverse().join('')
  // Both are correct, but the reverse-and-compare version allocates an array
  // plus a whole second string (O(n) extra memory) and always scans the entire
  // input. The two-pointer version uses O(1) extra space and bails out at the
  // first mismatch — for 'abcdef' that's one comparison instead of a full copy.
}

module.exports = isPalindrome;
