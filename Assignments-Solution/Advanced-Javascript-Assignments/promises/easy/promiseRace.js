// Problem Description – Custom Implementation of Promise.race
//
// You are required to implement your own version of Promise.race without using the built-in method.
// The function should accept an iterable of values that may include Promises or plain values.
// It must settle as soon as the first input settles, resolving or rejecting accordingly.
// Using Promise.resolve ensures non-promise values are handled correctly.

function promiseRace(promises) {
  return new Promise((resolve, reject) => {
    // Deliberately no empty-input special case here. Per the spec, racing an
    // empty iterable produces a promise that stays pending FOREVER — which is
    // logically right: "the first to settle" has no answer when nobody is
    // running. (Contrast promiseAll, where "all of zero" is vacuously true.)
    for (const item of promises) {
      // Normalise so plain values participate. A plain value becomes an
      // already-resolved promise, so it wins any race against a timer — which is
      // why `promiseRace([42, Promise.resolve(100)])` yields 42: both settle in
      // the same microtask drain, and 42 was attached first.
      Promise.resolve(item).then(resolve, reject);
    }

    // The whole implementation leans on one rule: a promise can only settle
    // ONCE. Every input is wired to the same resolve/reject pair, and the first
    // one to fire locks in the outcome; every later call is a silent no-op.
    // No latch or bookkeeping needed — the promise machinery provides it.
    //
    // Also worth knowing: losers are not cancelled. They keep running to
    // completion in the background; their results are just discarded. That's why
    // "race a request against a timeout" saves the *caller* time but doesn't
    // stop the underlying work.
  });
}

module.exports = promiseRace;
