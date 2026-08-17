// Problem Description – Distributed Median Finder (Binary Search + Promises)
//
// You are required to find the median of two sorted arrays stored on remote servers.
// Accessing elements requires asynchronous API calls.
//
// Requirements:
// 1. Compute the median using binary search logic
// 2. Minimize network calls (avoid fetching full arrays)
// 3. Use Promise-based parallel requests when possible, with controlled execution
//
// Each server exposes: get(index) -> Promise<number>, length() -> Promise<number>

async function findDistributedMedian(serverA, serverB) {
  // Wrap each server in a memoising accessor.
  //
  // Requirement 2 is the real constraint here: every element access is a NETWORK
  // CALL, so the algorithm is judged on how few it makes. The binary search
  // naturally revisits the same indices across iterations, and caching turns
  // those repeats into free lookups.
  const cachedGet = (server) => {
    const cache = new Map();
    return (index) => {
      if (!cache.has(index)) cache.set(index, server.get(index));
      // Note we cache the PROMISE, not the value — so two concurrent requests
      // for the same index share one round trip instead of racing.
      return cache.get(index);
    };
  };

  let A = { get: cachedGet(serverA), length: await serverA.length() };
  let B = { get: cachedGet(serverB), length: await serverB.length() };

  // Always binary-search over the SHORTER array. This bounds the work at
  // O(log(min(m, n))) network round trips instead of O(log(max)) — and it also
  // guarantees the partition index j below stays within B's bounds.
  if (A.length > B.length) [A, B] = [B, A];

  const m = A.length;
  const n = B.length;
  const half = Math.floor((m + n + 1) / 2);

  let lo = 0;
  let hi = m;

  while (lo <= hi) {
    // We're searching for a PARTITION, not for the value itself. Cut A after `i`
    // elements and B after `j`, chosen so the two left parts together hold
    // exactly half the data. The median then sits on the boundary.
    const i = Math.ceil((lo + hi) / 2);
    const j = half - i;

    // Sentinels for the edges: an empty left part behaves like -Infinity (never
    // too big), an empty right part like +Infinity (never too small). These make
    // the comparison below uniform with no special-casing.
    const [aLeft, aRight, bLeft, bRight] = await Promise.all([
      i > 0 ? A.get(i - 1) : Promise.resolve(-Infinity),
      i < m ? A.get(i) : Promise.resolve(Infinity),
      j > 0 ? B.get(j - 1) : Promise.resolve(-Infinity),
      j < n ? B.get(j) : Promise.resolve(Infinity),
    ]);
    // Requirement 3: the four probes for one iteration are independent, so they
    // are issued CONCURRENTLY and cost one round trip's latency rather than
    // four. Across iterations we must stay sequential — the next partition
    // depends on this comparison.

    if (aLeft <= bRight && bLeft <= aRight) {
      // Correct partition: everything on the left is <= everything on the right.
      const maxLeft = Math.max(aLeft, bLeft);

      // Odd total: the median is the largest element of the left half.
      if ((m + n) % 2 === 1) return maxLeft;

      // Even total: average the boundary elements.
      const minRight = Math.min(aRight, bRight);
      return (maxLeft + minRight) / 2;
    }

    if (aLeft > bRight) {
      // We took too much from A — shrink A's left part.
      hi = i - 1;
    } else {
      // We took too little from A — grow A's left part.
      lo = i + 1;
    }
  }

  throw new Error("Input arrays are not sorted");

  // Why this beats the obvious approach: merging both arrays would fetch every
  // element — O(m + n) network calls — to compute one number. Binary searching
  // the partition touches only ~4·log(min(m,n)) elements, which for two arrays
  // of a million rows is a handful of calls instead of two million.
}

module.exports = findDistributedMedian;
