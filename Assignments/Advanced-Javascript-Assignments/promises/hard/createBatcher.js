// Problem Description – Request Batcher (DataLoader pattern)
//
// createBatcher(fetchBulkFn, delayMs) returns a function `load(id)`.
//
// Individual load(id) calls made within the same time window are collected and
// resolved with ONE bulk call: fetchBulkFn([id1, id2, ...]) -> { id: value }.
// Each caller receives only its own value, and every caller in a failed batch
// receives the same rejection.

function createBatcher(fetchBulkFn, delayMs) {
  let pending = []; // { id, resolve, reject } collected in the current window
  let timer = null;

  async function flush() {
    // Take ownership of the current window and open a new one immediately.
    // Anything that arrives while the bulk call is in flight must form the NEXT
    // batch, not silently join one that has already been dispatched.
    const batch = pending;
    pending = [];
    timer = null;

    if (batch.length === 0) return;

    const ids = batch.map((entry) => entry.id);

    try {
      // ONE round trip for the whole window. This is the entire economic
      // argument for the pattern: 100 individual lookups become 1 query, which
      // is how DataLoader solves the N+1 problem in GraphQL resolvers — each
      // field resolver naively asks for its own record, and the batcher quietly
      // coalesces them.
      const resultMap = await fetchBulkFn(ids);

      // Fan the single bulk response back out to the individual callers. Each
      // one only ever sees its own value; the fact that it travelled in a batch
      // is invisible from the outside, which is what makes this a drop-in
      // optimisation.
      batch.forEach(({ id, resolve }) => resolve(resultMap[id]));
    } catch (err) {
      // The bulk call is all-or-nothing, so every caller in the window gets the
      // same rejection. Critically, each of these promises has a real handler
      // attached by its own caller, so no unhandled rejections are produced.
      batch.forEach(({ reject }) => reject(err));
    }
  }

  return function load(id) {
    return new Promise((resolve, reject) => {
      // Park this caller's resolve/reject so they can be settled later, once the
      // bulk response arrives. The caller simply awaits, unaware of the batching.
      pending.push({ id, resolve, reject });

      // Arm the window on the FIRST item only — deliberately not reset by later
      // loads. Resetting would make this a debounce, which under a steady stream
      // of loads would never fire. Arming once makes delayMs a hard latency
      // ceiling: no request waits longer than that to be dispatched.
      if (!timer) {
        timer = setTimeout(flush, delayMs);
      }
    });
  };

  // The trade being made: every request pays up to delayMs of extra latency in
  // exchange for collapsing N round trips into 1. With a small window (even 0ms,
  // which batches everything in the current tick) that cost is negligible while
  // the saving is large.
}

module.exports = createBatcher;
