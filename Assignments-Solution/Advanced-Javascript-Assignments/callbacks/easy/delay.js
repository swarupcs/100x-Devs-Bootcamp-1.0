// Problem Description – delay(ms, value, callback)
//
// You are required to write a function named delay that takes a time duration
// in milliseconds, a value, and a callback function.
// The function should wait for the given time and then invoke the callback
// with `null` as the first argument and the provided value as the second argument.

function delay(ms, value, callback) {
  // Node's convention is "error-first callbacks": the first parameter is always
  // reserved for an error and the actual payload comes after it. A successful
  // result therefore passes `null` (not `undefined`) as the error, which is what
  // lets the caller write `if (err) { ... }` uniformly for every async API.
  setTimeout(() => {
    callback(null, value);
  }, ms);
}

module.exports = delay;
