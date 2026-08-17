// Problem Description – Recursive Fetch with Redirect Handling
//
// You are required to fetch data for a given set of IDs.
// Each response may contain a redirectId, indicating that the data should be fetched
// again using the new ID.
// The process must continue until the final data is reached.
// Your implementation should also detect and prevent infinite redirect loops.
//
// `ids` is an object map, e.g. { a: "1", b: "2" }; the result maps each key to its
// final resolved data.

async function fetchDeep(ids, fetcher, maxDepth = 5) {
  // Follow one redirect chain to its end.
  //
  // Written as an iterative loop rather than actual recursion. Both are correct,
  // but a loop keeps the stack flat and makes the depth counter impossible to
  // get wrong.
  async function resolveOne(startId) {
    let currentId = startId;

    // `depth` is the safety bound. A redirect chain is untrusted input: a
    // misconfigured server can point A -> B -> A forever, and without a bound
    // this function would issue requests until the process died. The counter
    // catches BOTH a genuine cycle and a merely-too-long chain with one check.
    for (let depth = 0; depth <= maxDepth; depth++) {
      const data = await fetcher(currentId);

      // No redirect marker means we've reached the real payload — done.
      if (!data || !data.redirectId) {
        return data;
      }

      // Hop to the next id and go round again.
      currentId = data.redirectId;
    }

    // Fell out of the loop: the chain never terminated within the budget.
    throw new Error("Max redirect depth exceeded");
  }

  const keys = Object.keys(ids);

  // Resolve every key's chain CONCURRENTLY. Each chain is internally sequential
  // (you can't know the next id until the current response arrives), but the
  // chains are independent of one another, so there is no reason to serialise
  // them. Total time is the length of the slowest chain, not the sum of all.
  const values = await Promise.all(keys.map((key) => resolveOne(ids[key])));

  // Reassemble into an object keyed the same way as the input. Promise.all
  // preserves order, so values[i] reliably belongs to keys[i].
  const result = {};
  keys.forEach((key, index) => {
    result[key] = values[index];
  });

  return result;

  // Error behaviour: because we use Promise.all, a failure in ANY chain (a
  // fetcher throw or an exceeded depth) rejects the whole call. That's usually
  // what you want for a batch that must be complete — use Promise.allSettled
  // instead if partial results are acceptable.
}

module.exports = fetchDeep;
