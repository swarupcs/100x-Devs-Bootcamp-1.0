// Problem Description – Event Loop Execution Order
//
// You are given a script that mixes synchronous code, Promises (microtasks),
// and timers (macrotasks).
//
// Your task is to understand and predict the order in which the logs
// are printed to the console.

function eventLoopRace() {
  // The numbers below are the order the statements are WRITTEN.
  // The order they PRINT is: 1, 4, 3, 2.

  // (1) Synchronous — runs immediately, on the current call stack.
  console.log("1: Synchronous");

  // (2) Macrotask. setTimeout hands the callback to the TIMER phase of the event
  // loop. Even with a 0ms delay it cannot run until the current stack unwinds
  // AND the microtask queue has been fully drained. It therefore prints LAST.
  setTimeout(() => {
    console.log("2: Macrotask (I/O)");
  }, 0);

  // (3) Microtask. An already-resolved promise's .then() callback is queued on
  // the MICROTASK queue, which the engine drains completely the instant the
  // current synchronous script finishes — before touching any timer.
  // So it beats the setTimeout above, but loses to the sync line below.
  Promise.resolve().then(() => {
    console.log("3: Microtask (Promise)");
  });

  // (4) Synchronous — still on the same uninterrupted call stack, so it prints
  // before ANY queued callback, microtask or macrotask alike.
  console.log("4: Synchronous");

  // The rule to remember, in strict priority order:
  //
  //   1. All synchronous code in the current stack, top to bottom.
  //   2. Then the entire microtask queue (promise callbacks, queueMicrotask,
  //      process.nextTick) — drained to empty, including microtasks queued by
  //      other microtasks. This is why a runaway microtask loop can starve
  //      timers forever.
  //   3. Then ONE macrotask (timer / I/O / setImmediate), after which the
  //      microtask queue is drained again, and so on.
}

module.exports = eventLoopRace;
