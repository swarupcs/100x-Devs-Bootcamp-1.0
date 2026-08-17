// Problem Description – promiseAny(promises)
//
// You are required to implement a function named promiseAny that accepts an array of Promises.
// The function should return a new Promise that resolves immediately when any one of the input
// promises resolves successfully.
// If all the promises reject, the returned Promise should reject with an error.

function promiseAny(promises) {
  return new Promise((resolve, reject) => {
    // With nothing to succeed, success is impossible — reject rather than hang.
    if (!promises || promises.length === 0) {
      return reject(new Error("Empty iterable"));
    }

    const errors = new Array(promises.length);
    let rejectedCount = 0;

    promises.forEach((item, index) => {
      Promise.resolve(item).then(
        // First success wins outright. This is the inverse of promiseAll:
        // `all` fails fast on the first rejection and needs every success;
        // `any` succeeds fast on the first fulfilment and needs every failure.
        resolve,
        (err) => {
          // Keep each error at its own index so the aggregate report lines up
          // with the input order — useful when you need to know *which* of five
          // mirrors failed and why.
          errors[index] = err;
          rejectedCount++;

          // Only once EVERY input has rejected do we give up.
          if (rejectedCount === promises.length) {
            // The native Promise.any throws an AggregateError carrying every
            // individual reason. We mirror that shape by attaching `.errors`,
            // so no diagnostic information is lost.
            const aggregate = new Error("All promises were rejected");
            aggregate.errors = errors;
            reject(aggregate);
          }
        }
      );
    });
  });
}

module.exports = promiseAny;
