// Problem Description – Sequential Execution of Async Functions
//
// You are given an array of asynchronous functions. Your task is to execute them
// one by one, ensuring that each function starts only after the previous one has
// completed. The final result should be an array of resolved values in the same order.

async function runSequential(functions) {
  const results = [];

  // A `for...of` loop with `await` inside is the correct — and only
  // straightforward — way to force sequential execution. The loop body suspends
  // at the await, so `functions[i + 1]` is not even CALLED until `functions[i]`
  // has settled.
  //
  // This is exactly the "await inside a loop" pattern that linters warn about
  // and that runParallel.js avoids. Here it's not a bug, it's the requirement:
  // use it when each step depends on the previous one's result, when you must
  // not hammer a rate-limited API, or when ordering of side effects matters.
  // The cost is that total time becomes the SUM of all durations.
  for (const fn of functions) {
    // Because we await before pushing, results land in call order automatically —
    // no index bookkeeping is needed the way it is with parallel schemes.
    const value = await fn();
    results.push(value);
  }

  return results;

  // Note: .map() + await does NOT work here —
  //     functions.map(async fn => await fn())
  // invokes every function immediately and runs them in parallel, because .map
  // does not wait for the async callback it just handed you back a promise for.
  // A `for...of` loop (or a reduce-over-promises chain) is required.
}

module.exports = runSequential;
