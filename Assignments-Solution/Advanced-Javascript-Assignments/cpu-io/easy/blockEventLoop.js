// Problem Description – Block Event Loop
//
// In Node.js, long-running synchronous operations block the event loop,
// preventing other tasks (like timers or I/O) from executing.
//
// Your task is to implement a function `blockEventLoop(ms)` that
// synchronously blocks the execution for the given duration.
//
// Requirements:
// 1. Do NOT use `setTimeout` or Promises (those are non-blocking).
// 2. Use a `while` loop with `Date.now()` or `performance.now()`.
// 3. This is a teaching tool to show how NOT to write async code.

function blockEventLoop(ms) {
  // performance.now() rather than Date.now() on purpose. Date.now() only has
  // whole-millisecond resolution, so a "block for 10ms" loop can exit after as
  // little as ~9.5 real milliseconds (it started 0.5ms into the tick it read as
  // 0). performance.now() is monotonic and sub-millisecond, so the guarantee
  // "blocked for at least `ms`" actually holds.
  const start = performance.now();

  // A "busy-wait" (spin loop). It burns 100% of a CPU core doing nothing but
  // re-reading the clock, and — crucially — it never returns to the event loop.
  //
  // JavaScript is single-threaded: the event loop can only pick up the next
  // timer, I/O callback, or even a microtask AFTER the current call stack
  // unwinds completely. While this loop spins, that stack never unwinds, so
  // everything else is frozen:
  //
  //   - setTimeout(fn, 0) callbacks queue up but do not run
  //   - setImmediate callbacks do not run
  //   - even Promise .then() microtasks do not run (they're checked only
  //     between stack unwinds, and there is no unwind here)
  //   - in a server, no request is served; in a browser, the page can't repaint
  //
  // Note that `ms = 0` exits immediately: the condition is false on first check.
  while (performance.now() - start < ms) {
    // Intentionally empty — the loop condition IS the work.
  }

  // The lesson: this is what any long synchronous computation does implicitly.
  // See yieldedCPU.js for the cooperative alternative.
}

module.exports = blockEventLoop;
