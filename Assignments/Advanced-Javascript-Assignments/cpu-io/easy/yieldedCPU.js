// Problem Description – Yielding a CPU-Intensive Task
//
// You are given a CPU-heavy computation that runs inside a loop.
// Instead of blocking the event loop completely, your task is to
// periodically yield control back to the event loop.
//
// By using setTimeout inside an async function, the computation
// should pause every fixed number of iterations, allowing other
// asynchronous tasks (like timers or I/O callbacks) to run.

async function yieldedCPU(iterations) {
  let sum = 0;

  // How many iterations to run before handing the thread back. This is the
  // classic latency/throughput dial:
  //   - smaller chunk -> more yields -> more responsive, but slower overall
  //     (each yield costs a full trip through the event loop)
  //   - larger chunk  -> fewer yields -> faster, but longer freezes
  const CHUNK_SIZE = 1000;

  for (let i = 0; i < iterations; i++) {
    sum += i;

    // At each chunk boundary, pause. `await` suspends this function and returns
    // control to the event loop, which is then free to run the pending timers
    // and I/O callbacks that heavyCPU.js would have starved. Once the timer
    // fires, execution resumes on the very next line with all local state
    // (`sum`, `i`) intact — that's the magic of async functions: the loop is
    // sliced across many event-loop ticks without being rewritten.
    //
    // setTimeout(0) rather than `await Promise.resolve()` is deliberate.
    // Awaiting a resolved promise only yields to the MICROTASK queue, which is
    // drained completely before the event loop ever looks at timers — so it
    // would let nothing else in. Only a macrotask genuinely releases the loop.
    if (i > 0 && i % CHUNK_SIZE === 0) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  return sum;
}

module.exports = yieldedCPU;
