/*
 * Write 3 different functions that return promises that resolve after t1, t2, and t3 seconds respectively.
 * Write a function that uses the 3 functions to wait for all 3 promises to resolve using Promise.all,
 * Return a promise.all which return the time in milliseconds it takes to complete the entire operation.
 */

// Three separate functions, as the assignment specifies. They're deliberately
// identical in behaviour — the point isn't that they differ, it's that we have
// three independent async operations to coordinate.
function wait1(t) {
  return new Promise((resolve) => setTimeout(resolve, t * 1000));
}

function wait2(t) {
  return new Promise((resolve) => setTimeout(resolve, t * 1000));
}

function wait3(t) {
  return new Promise((resolve) => setTimeout(resolve, t * 1000));
}

function calculateTime(t1, t2, t3) {
  const startTime = Date.now();

  // THE CRITICAL DETAIL: all three functions are CALLED here, on this line, in
  // the same tick. Each call starts its timer immediately and hands back a
  // pending promise, so by the time Promise.all receives the array, all three
  // waits are already counting down SIMULTANEOUSLY.
  //
  // This is why the total is max(t1, t2, t3) and not their sum. For (1, 2, 3)
  // the answer is ~3000ms: the 1s and 2s timers expire while the 3s one is still
  // running, so their time costs nothing extra.
  //
  // Promise.all then waits for the slowest member of the batch and resolves once
  // every one of them has settled.
  return Promise.all([wait1(t1), wait2(t2), wait3(t3)]).then(() => {
    // Measure only AFTER all three have finished. Returning a value from inside
    // .then() makes that value the resolution of the outer promise, so
    // calculateTime resolves with the elapsed milliseconds.
    return Date.now() - startTime;
  });

  // Compare with 4-promise-chain.js, which runs the same three waits
  // SEQUENTIALLY and therefore takes t1 + t2 + t3. For (1, 2, 3) that's ~6000ms
  // versus ~3000ms here — the same work, twice as slow, purely because of how it
  // was scheduled.
  //
  // The rule this illustrates: use Promise.all whenever the operations are
  // INDEPENDENT of one another. Await them one at a time only when a later step
  // genuinely needs an earlier step's result.
  //
  // Note also that Promise.all is fail-fast: if any input rejects, the whole
  // thing rejects immediately without waiting for the others.
}

module.exports = calculateTime;
