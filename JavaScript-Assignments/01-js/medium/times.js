/*
Write a function that calculates the time (in seconds) it takes for the JS code to calculate sum from 1 to n, given n as the input.
Try running it for
1. Sum from 1-100
2. Sum from 1-100000
3. Sum from 1-1000000000
Hint - use Date class exposed in JS

Run this file directly to see the measurements:
  node medium/times.js
*/

function calculateTime(n) {
  // Take a timestamp BEFORE the work starts. Date.now() returns milliseconds
  // since the Unix epoch as an integer.
  const startTime = Date.now();

  // The work being measured: a naive loop summing 1..n.
  //
  // Note `let sum` must be declared outside the loop, and note that this is
  // deliberately the SLOW way to do it — the whole point of the exercise is to
  // watch the cost grow with n. (The closed form n*(n+1)/2 computes the same
  // answer in constant time, which is exactly the comparison worth making once
  // you've seen the numbers below.)
  let sum = 0;
  for (let i = 1; i <= n; i++) {
    sum += i;
  }

  const endTime = Date.now();

  // Convert milliseconds to seconds, as the problem asks.
  //
  // A caveat worth internalising: Date.now() has only whole-millisecond
  // resolution, so for n = 100 the elapsed time is almost always reported as 0.
  // That isn't a bug in the measurement — the work genuinely finishes in well
  // under a millisecond. For sub-millisecond timing you'd reach for
  // performance.now(), which is monotonic and offers fractional precision.
  //
  // Date.now() carries a second hazard for benchmarks: it tracks WALL-CLOCK
  // time, so an NTP correction or a daylight-saving jump mid-measurement can
  // produce a nonsensical (even negative) duration. performance.now() is immune
  // to that because it only ever moves forward.
  return (endTime - startTime) / 1000;
}

// Running this file directly demonstrates how the cost scales. Each step
// multiplies n by roughly 1000x and the elapsed time grows in proportion —
// that's what O(n) looks like from the outside.
//
// `require.main === module` is Node's idiom for "am I being run directly, rather
// than imported?" It keeps this demo from executing when another file requires
// this module.
if (require.main === module) {
  console.log("Sum 1 to 100:            ", calculateTime(100), "seconds");
  console.log("Sum 1 to 100,000:        ", calculateTime(100000), "seconds");
  console.log("Sum 1 to 1,000,000,000:  ", calculateTime(1000000000), "seconds");

  // Worth noticing while that last line runs: the loop is SYNCHRONOUS, so for
  // its entire duration the event loop is completely blocked. No timer fires, no
  // I/O callback runs, and in a server no request gets served. This is the
  // practical reason heavy CPU work belongs in a worker thread.
}

module.exports = calculateTime;
