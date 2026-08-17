// Problem Description – callbackify(fn)
//
// You are required to write a function named callbackify that takes a function
// which returns a Promise.
// The function should return a new function that accepts a callback as its
// last argument.
// When the Promise resolves, the callback should be called with `(null, data)`.
// When the Promise rejects, the callback should be called with the error.

function callbackify(fn) {
  // This is the inverse of `promisify`: it adapts a modern promise-returning API
  // back into the classic error-first callback style, so promise code can be
  // handed to an older library that only understands callbacks.
  //
  // We use a rest parameter because we don't know the arity of `fn` up front —
  // the wrapper must forward however many arguments the caller supplied.
  return function (...args) {
    // By contract the callback is always the LAST argument, so we pop it off;
    // whatever remains is the real argument list destined for `fn`.
    const callback = args.pop();

    // Wrapping the call in try/catch covers the case where `fn` throws
    // *synchronously* (before ever producing a promise). Without this, that throw
    // would escape past the caller's callback-based error handling entirely.
    let promise;
    try {
      promise = fn(...args);
    } catch (err) {
      return callback(err);
    }

    promise.then(
      // Success: error slot is null, payload second.
      (data) => callback(null, data),
      // Failure: pass the rejection reason through untouched. Note we use the
      // two-argument form of .then() rather than .then().catch() on purpose —
      // with .catch() chained on, an exception thrown *inside* the success
      // callback would be swallowed and re-reported as a failure, invoking the
      // user's callback twice. The two-argument form keeps the paths exclusive.
      (err) => callback(err)
    );
  };
}

module.exports = callbackify;
