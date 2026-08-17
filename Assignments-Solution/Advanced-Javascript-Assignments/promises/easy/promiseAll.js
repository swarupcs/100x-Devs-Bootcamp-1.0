// Problem Description – Custom Implementation of Promise.all
//
// You are required to implement your own version of Promise.all without using the built-in method.
// The function should accept an array of values that may include Promises or plain constants.
// It must resolve with an array of results in the same order once all inputs resolve,
// or reject immediately if any input rejects.

function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    // Validate INSIDE the executor rather than throwing before the Promise is
    // constructed. A function that returns a promise should always return a
    // promise — a synchronous throw would bypass the caller's .catch().
    if (!Array.isArray(promises)) {
      return reject(new TypeError("Argument must be an array"));
    }

    // An empty input has nothing to wait for, so it must settle right away.
    // Miss this case and the promise stays pending forever, because the
    // counter below would never reach zero.
    if (promises.length === 0) {
      return resolve([]);
    }

    const results = new Array(promises.length);
    let resolvedCount = 0;

    promises.forEach((item, index) => {
      // Promise.resolve() normalises the input: real promises pass through
      // untouched, plain values (and thenables) get lifted into a promise. This
      // one line is what lets `promiseAll([1, Promise.resolve(2), 3])` work.
      Promise.resolve(item).then(
        (value) => {
          // Store by index, not by push — completion order is arbitrary but the
          // output must mirror the input order.
          results[index] = value;
          resolvedCount++;

          // Counting completions is how we know when we're done. Note we compare
          // against the length, not `results.length`, since a pre-sized array
          // already reports the full length from the start.
          if (resolvedCount === promises.length) {
            resolve(results);
          }
        },
        // Fail fast: the FIRST rejection settles the whole thing. The other
        // promises keep running (a promise cannot be cancelled), but since a
        // promise can only settle once, their later results are simply ignored.
        reject
      );
    });
  });
}

module.exports = promiseAll;
