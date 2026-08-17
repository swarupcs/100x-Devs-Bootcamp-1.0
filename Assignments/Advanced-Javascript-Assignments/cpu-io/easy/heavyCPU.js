// Problem Description – Blocking CPU-Intensive Task
//
// You are given a function that performs a large number of calculations
// synchronously using a loop.
//
// Your task is to observe and understand how a CPU-heavy synchronous
// operation blocks the JavaScript event loop, preventing other code
// (such as timers or async callbacks) from running until it completes.

function heavyCPU(iterations) {
  let sum = 0;

  // A plain synchronous loop. For `iterations = 5` this returns 0+1+2+3+4 = 10.
  //
  // The important part is not the arithmetic but the shape: from the moment
  // heavyCPU is called until it returns, this function OWNS the single JS
  // thread. A `setTimeout(fn, 0)` registered just before the call will not fire
  // until after the loop finishes, no matter how long that takes.
  //
  // Note that being "async" would not help here. Wrapping this in an async
  // function or a Promise changes nothing — a promise only defers the *handling*
  // of a result; the CPU work itself still runs to completion on the same
  // thread. Async in JS solves WAITING (I/O), not COMPUTING.
  for (let i = 0; i < iterations; i++) {
    sum += i;
  }

  return sum;

  // Real escape hatches for genuinely heavy CPU work:
  //   - worker_threads / Web Workers  -> a separate thread, true parallelism
  //   - chunking + yielding           -> see yieldedCPU.js, keeps the loop alive
  //   - native addons / WASM          -> make the work itself cheaper
}

module.exports = heavyCPU;
