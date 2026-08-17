// Problem Description – Chained Async Function Execution
//
// You are required to implement a function that accepts an array of asynchronous functions.
// Each function should be executed only after the previous one has completed, and it should
// receive the resolved result of the previous function as its input.
// The final output should be the result of the last function in the chain.

async function asyncWaterfall(tasks, initialValue) {
  // The accumulator carries the value from one stage to the next. It starts as
  // the seed and is reassigned after every step — this is the "waterfall": data
  // cascading down through a pipeline of transformations.
  let value = initialValue;

  for (const task of tasks) {
    // Sequential by necessity, not merely by choice: stage N+1 cannot start
    // because it does not yet have its input. This is the case where awaiting
    // inside a loop is exactly right (contrast Promise.all, which needs the
    // operations to be independent).
    //
    // `await` also transparently accepts a plain, non-promise return value —
    // which is why a synchronous function works in the chain with no special
    // handling.
    value = await task(value);
  }

  // With an empty task list the loop never runs and the seed passes straight
  // through, which is the mathematically sensible identity behaviour.
  return value;

  // Error semantics: an unhandled throw in any stage propagates out immediately
  // and the remaining stages never run — the pipeline stops at the break, which
  // is what you want when each stage depends on the last one's output.
}

module.exports = asyncWaterfall;
