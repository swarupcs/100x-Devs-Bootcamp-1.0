// Problem Description – Promisify Utility
//
// You are given a legacy function that uses Node.js callback style:
// (err, result) => { ... }.
//
// Your task is to implement promisify(fn) that converts it into a Promise-based function.
//
// The returned function must:
// 1. Resolve with result if callback gets (null, result)
// 2. Reject if callback gets an error

function promisify(fn) {
  // The bridge from the callback world to the promise world. It works because
  // the two error conventions map cleanly onto each other:
  //     callback(err, ...)  ->  reject(err)
  //     callback(null, val) ->  resolve(val)
  return function (...args) {
    return new Promise((resolve, reject) => {
      // Append our own callback after whatever arguments the caller passed.
      // We rely on the convention that the callback is always last.
      fn(...args, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  };

  // Two subtleties worth internalising:
  //
  // 1. We don't need an exactly-once latch here. Even if the legacy function
  //    misbehaves and calls its callback twice, the second resolve/reject is a
  //    no-op — promises are single-settlement by construction. Promisifying a
  //    sketchy API therefore hardens it for free.
  //
  // 2. `if (err)` rather than `if (err !== null)` is intentional but has a sharp
  //    edge: a falsy-but-real error (0, "") would be treated as success. Node's
  //    own util.promisify makes the same trade-off, since every well-behaved
  //    callback API passes null/undefined on success.
}

module.exports = promisify;
