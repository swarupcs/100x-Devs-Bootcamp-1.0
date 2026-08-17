// Problem Description – Ordered Event Emitter Bridge (Sequenced Resolver)
//
// You are required to implement createSequencedResolver() to handle out-of-order events.
//
// The resolver must support:
// 1. push(id, data): provides data for a given id
// 2. waitFor(id): returns a Promise that resolves when data for id is available
//
// Even if data arrives out of order, promises must resolve in strict order.
// Example: waitFor(2) must not resolve until id 1 has been pushed and resolved.

function createSequencedResolver() {
  const buffer = new Map(); // id -> data that has arrived but not yet released
  const waiters = new Map(); // id -> resolve function of a pending waitFor
  let nextId = 1; // the id the sequence is currently blocked on

  // Release everything that is now contiguous from `nextId` upward.
  //
  // This is a reassembly buffer, the same idea TCP uses to turn out-of-order
  // packets back into an ordered byte stream. Data for id 5 may physically
  // arrive first, but it is held until 1..4 have been released, so consumers
  // observe a strictly ordered sequence regardless of network reordering.
  function drain() {
    // `while`, not `if`: filling one gap can unblock a long run at once. If 2,
    // 3 and 4 are all buffered and 1 finally arrives, all four release together.
    while (buffer.has(nextId)) {
      const data = buffer.get(nextId);

      // The entry is deliberately left in the buffer rather than deleted, so a
      // waitFor() that arrives AFTER its id was released can still be answered
      // from it (see the `id < nextId` fast path below).
      const resolve = waiters.get(nextId);
      if (resolve) {
        waiters.delete(nextId);
        resolve(data);
      }
      // If nobody is waiting on this id we still consume it and advance. The
      // sequence must not stall just because no consumer happened to ask — that
      // would deadlock every later id behind an unwatched one.

      nextId++;
    }
  }

  return {
    push(id, data) {
      buffer.set(id, data);
      // An arrival may or may not fill the current gap; drain() decides.
      drain();
    },

    waitFor(id) {
      // Already released — the sequence has moved past this id.
      if (id < nextId) {
        return Promise.resolve(buffer.get(id));
      }

      return new Promise((resolve) => {
        // Park the resolve function. Registering a waiter for a future id is
        // perfectly normal here (the test does exactly that), and the ordering
        // guarantee holds whether waitFor is called before or after push.
        waiters.set(id, resolve);

        // Cover the case where the data was already buffered and contiguous
        // before anyone asked for it.
        drain();
      });
    },
  };
}

module.exports = createSequencedResolver;
