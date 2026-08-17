// Problem Description – Race with Winner Information
//
// You are given an object where keys are labels and values are Promises.
// Your task is to implement raceWithMetadata(promiseMap).
//
// The function should behave like Promise.race, but also return which promise won.
//
// It must resolve with an object:
// { winner: <key>, value: <resolved value> }

async function raceWithMetadata(promiseMap) {
  const entries = Object.entries(promiseMap);

  // The trick: you cannot ask a settled promise "who were you?" — Promise.race
  // hands you a bare value with no provenance. So we attach the label BEFORE
  // racing, by mapping each promise to a new one that resolves to a
  // `{ winner, value }` envelope carrying its own key along with it.
  //
  // The closure over `key` is what makes this work: each wrapper remembers which
  // entry it came from.
  const labelled = entries.map(([key, promise]) =>
    Promise.resolve(promise).then((value) => ({ winner: key, value }))
  );

  // Race the envelopes rather than the raw promises. Whichever resolves first
  // brings its own identity with it.
  return Promise.race(labelled);

  // Rejection behaviour: we deliberately do NOT catch here. A rejection passes
  // straight through the .then() above (which only has a fulfilment handler) and
  // wins the race unchanged — so if the fastest promise fails, the caller sees
  // that raw error, exactly like Promise.race.
  //
  // This "attach metadata by wrapping" pattern generalises well: the same shape
  // gives you timing info (record Date.now() before, subtract in the handler) or
  // an index instead of a key.
}

module.exports = raceWithMetadata;
