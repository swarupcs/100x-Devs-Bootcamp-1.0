/*
  Write a function `compression` which takes a string as input and returns a compressed version of the string. The compression is done by replacing consecutive repeating characters with the character followed by the count of repetitions. If a character does not repeat, it is not followed by a count.

  Example:
  - Input: "aaabbbbcccvvmm"  -> "a3b4c3v2m2"
  - Input: "abc"             -> "abc"
  - Input: "aabbcc"          -> "a2b2c2"
  - Input: ""                -> ""

  Note:
  - The function should work for any alphanumeric string.

  Once you've implemented the logic, test your code by running
  - `npm run test-compressString`
*/

function compression(str) {
  // This is RUN-LENGTH ENCODING, the simplest lossless compression scheme there
  // is. The key word is CONSECUTIVE: only characters adjacent to each other are
  // collapsed. "aabaa" compresses to "a2ba2", not "a4b" — the two runs of 'a'
  // are separate because a 'b' sits between them.
  //
  // That's also why "aaAAa" gives "a2A2a": the comparison is case-SENSITIVE, so
  // 'a' and 'A' start different runs.

  if (str.length === 0) return "";

  // Building an array of pieces and joining once at the end, rather than using
  // `result += ...` in the loop. Strings are immutable in JavaScript, so each
  // `+=` allocates a whole new string; for long inputs that's O(n²) copying.
  // Push-then-join is the standard fix.
  const parts = [];

  let currentChar = str[0];
  let runLength = 1;

  // Start at index 1 — index 0 is already loaded as the run in progress.
  for (let i = 1; i < str.length; i++) {
    if (str[i] === currentChar) {
      // The run continues.
      runLength++;
    } else {
      // The run just ended. Emit it, then start a new one at this character.
      parts.push(formatRun(currentChar, runLength));
      currentChar = str[i];
      runLength = 1;
    }
  }

  // Flush the FINAL run.
  //
  // This line outside the loop is essential and the most commonly forgotten part
  // of run-length encoding: the last run has no following character to trigger
  // the "run ended" branch, so without this the trailing group silently
  // disappears ("aaabbb" would compress to just "a3").
  parts.push(formatRun(currentChar, runLength));

  return parts.join("");
}

// A run of one is written as the bare character, with no "1" suffix — that's the
// "if a character does not repeat, it is not followed by a count" rule.
//
// Worth noting the consequence: this makes the encoding AMBIGUOUS to decode when
// the alphabet includes digits. "a12" could mean twelve a's or "a1" followed by
// two... something. Real formats avoid this by always emitting the count, or by
// only compressing runs long enough to be worth it.
function formatRun(char, length) {
  return length === 1 ? char : char + length;
}

module.exports = compression;
