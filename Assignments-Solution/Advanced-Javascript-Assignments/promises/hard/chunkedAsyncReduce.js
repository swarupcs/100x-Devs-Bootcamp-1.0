// Problem Description – Non-Blocking Heavy Reducer (Chunked Async Reduce)
//
// You are given a very large array of numbers and a hash function.
// Your task is to implement chunkedAsyncReduce(data, hashFn, chunkSize).
//
// The function must process the array in chunks of size chunkSize to avoid blocking
// the event loop.
//
// Requirements:
// 1. Compute the final reduced/hash result across all elements
// 2. Break computation into chunks and yield between chunks
// 3. Return a single Promise that resolves with the final result
// 4. Use setImmediate or MessageChannel for yielding (not setTimeout)

async function chunkedAsyncReduce(data, hashFn, chunkSize) {
  if (data.length === 0) return undefined;

  // Seed with the first element, exactly like Array.prototype.reduce with no
  // initial value. This keeps the function agnostic about what `hashFn`
  // accumulates — it works for a sum, a running hash, a string builder, or a
  // max, with no assumption about a "zero" value.
  let accumulator = data[0];

  for (let i = 1; i < data.length; i++) {
    accumulator = hashFn(accumulator, data[i]);

    // Yield at each chunk boundary. The reduction itself is pure CPU work, and
    // on a 100,000-element array it would otherwise hold the thread for the
    // entire computation — no timers, no I/O, no repaints. Slicing it lets the
    // rest of the program stay alive.
    //
    // The accumulator survives across yields because it's an ordinary local in
    // an async function: the suspension preserves the whole scope, so the loop
    // is spread over many event-loop ticks without any manual state machine.
    if (i % chunkSize === 0) {
      await yieldToEventLoop();
    }
  }

  return accumulator;
}

// Why setImmediate rather than setTimeout(0), as the task requires:
//
//   - setTimeout(0) is not really 0. The HTML spec (and Node, after a few
//     nested levels) clamps it to ~1ms, so a job with 500 chunks pays 500ms of
//     pure clamp overhead.
//   - setImmediate targets the CHECK phase of the current event-loop iteration,
//     firing right after pending I/O callbacks — so it yields properly while
//     resuming sooner and with less overhead.
//
// And crucially, neither can be replaced by `await Promise.resolve()`: microtasks
// are drained to completion BEFORE the loop ever reaches timers, I/O or
// rendering, so a microtask "yield" hands control to nothing at all.
function yieldToEventLoop() {
  return new Promise((resolve) => {
    if (typeof setImmediate === "function") {
      setImmediate(resolve);
    } else {
      // Browser fallback. MessageChannel is the standard trick for a true
      // macrotask yield with no clamping.
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(null);
    }
  });
}

module.exports = chunkedAsyncReduce;
