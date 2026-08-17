// ## Counter without setInterval

// Without using setInterval, try to code a counter in Javascript. There is a hint at the bottom of the file if you get stuck.

// (Hint: setTimeout)

// Run with:  node easy/2-counter.js

let counter = 0;

// The technique is RECURSIVE setTimeout: instead of asking the runtime to repeat
// a callback forever, the callback schedules its own next run each time it
// finishes. One-shot timers, chained end to end, produce a repeating effect.
const updateCounter = () => {
  counter++;
  console.log(counter);

  // Schedule the NEXT tick from inside this one. This line is what turns a
  // single delayed call into an ongoing loop.
  //
  // Note this is NOT true recursion in the stack sense: updateCounter returns
  // immediately after scheduling, and the next invocation starts on a fresh
  // stack when the timer fires. So the call stack never grows and this can run
  // indefinitely without any risk of overflow.
  if (counter < 10) {
    setTimeout(updateCounter, 1000);
  } else {
    console.log("Counter stopped after 10 ticks.");
  }
};

// Kick off the first tick.
setTimeout(updateCounter, 1000);

// WHY PREFER THIS OVER setInterval?
//
// 1. GUARANTEED GAP. setInterval measures from the START of each tick, so if the
//    callback takes 800ms and the interval is 1000ms, the next run begins just
//    200ms later. Here the next delay is scheduled after the work COMPLETES, so
//    there is always a full second of breathing room between runs.
//
// 2. NO PILE-UP. If a setInterval callback consistently takes longer than the
//    interval, the runtime queues executions back-to-back and they stack up
//    forever — a classic way to melt a process doing periodic async work.
//    Self-scheduling makes overlap structurally impossible: the next run cannot
//    be scheduled until the current one is done.
//
// 3. VARIABLE DELAY. Because the interval is decided fresh each time, it can
//    change on the fly — which is exactly how exponential-backoff polling is
//    built (retry after 1s, then 2s, then 4s...). setInterval is locked to a
//    single fixed period for its whole life.
//
// The trade-off: with setInterval you cancel via one clearInterval(id) call.
// Here you need a flag (or to store and clear the latest timeout id), since
// there is a new timer handle on every tick.
