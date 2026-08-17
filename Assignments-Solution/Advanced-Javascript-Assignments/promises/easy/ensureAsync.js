// Problem Description – ensureAsync(fn)
//
// You are required to write a function named ensureAsync that takes another function fn as input.
// The goal is to guarantee that calling fn always returns a Promise, even if fn is synchronous.
// Using the async keyword is recommended, as it automatically wraps return values and errors in a Promise.

function ensureAsync(fn) {
  // Marking the wrapper `async` does two jobs for free:
  //   1. Any plain return value is auto-wrapped in a resolved promise.
  //   2. Any *thrown* exception becomes a rejected promise instead of a
  //      synchronous throw.
  //
  // Point 2 is the real prize. A function that sometimes returns a promise and
  // sometimes throws synchronously forces callers to write BOTH try/catch and
  // .catch() around the same call. Normalising the interface means one error
  // path handles everything.
  //
  // (Also note: if `fn` already returns a promise, `return` inside an async
  // function adopts it rather than double-wrapping — no Promise<Promise<T>>.)
  return async function (...args) {
    return fn(...args);
  };
}

module.exports = ensureAsync;
