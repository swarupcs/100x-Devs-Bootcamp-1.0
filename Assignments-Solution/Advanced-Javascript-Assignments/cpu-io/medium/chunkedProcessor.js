// Problem Description – Smart Progress Bar (CPU Yielding)
//
// You need to process a large list of items without blocking
// the event loop.
//
// Process the items in small chunks and yield control back
// to the event loop after each chunk so the system stays responsive.
//
// Requirements:
// - Implement chunkedProcessor(items, processFn, onComplete).
// - Process items in fixed-size chunks.
// - Yield using setImmediate after each chunk.
// - Call onComplete after all items are processed.

function chunkedProcessor(items, processFn, onComplete) {
  const CHUNK_SIZE = 100;
  let index = 0;

  function processChunk() {
    // All done — including the empty-array case, which lands here on the very
    // first call and completes without ever touching processFn.
    if (index >= items.length) {
      return onComplete();
    }

    // Do one uninterrupted burst of work. Order is preserved because we always
    // resume from the same monotonically advancing `index`.
    const end = Math.min(index + CHUNK_SIZE, items.length);
    for (; index < end; index++) {
      processFn(items[index]);
    }

    // Yield, then continue with the next chunk.
    //
    // setImmediate schedules the callback for the CHECK phase of the current
    // event-loop iteration — i.e. after pending I/O callbacks have been handled.
    // In practice that makes it a slightly more efficient "yield now" than
    // setTimeout(0), which has to go through the timer phase and is subject to
    // the ~1ms minimum clamp.
    //
    // Either way the essential property is the same: this is a MACROTASK, so the
    // loop genuinely gets a chance to run the setInterval heartbeat, serve an
    // HTTP request, or repaint before we grab the thread again.
    setImmediate(processChunk);
  }

  processChunk();

  // Why recursion-via-scheduler instead of a plain `for` loop? A plain loop
  // would run all 50,000 items on one stack and freeze everything until it
  // finished. Here each chunk is its own fresh stack, so total memory stays
  // flat — this is not real recursion and cannot overflow the stack, because
  // each call returns before the scheduler invokes the next one.
}

module.exports = chunkedProcessor;
