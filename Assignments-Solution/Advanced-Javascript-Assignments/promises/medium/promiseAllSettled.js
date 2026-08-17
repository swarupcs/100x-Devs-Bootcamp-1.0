// Problem Description – Polyfill for Promise.allSettled
//
// You are required to implement a polyfill for Promise.allSettled.
// The function should accept an array of Promises and wait for all of them to either
// resolve or reject.
// It must return a Promise that resolves with an array of result objects describing the
// status and value or reason of each Promise.

function promiseAllSettled(promises) {
  // The defining property: this promise NEVER rejects. Whatever happens to the
  // inputs, it fulfils with a report describing each outcome.
  //
  // That's the whole reason allSettled exists alongside all(). Use all() when
  // the batch is atomic and one failure invalidates everything; use allSettled
  // when the items are independent and you want partial success — sending 100
  // emails, uploading 20 files, polling 5 mirrors. With all(), one bad item
  // would hide the 99 that worked.
  return Promise.all(
    promises.map((item) =>
      // Normalise plain values into promises so they report as fulfilled too.
      Promise.resolve(item).then(
        // Map each outcome onto the standard result shape. Because BOTH handlers
        // return a normal value (rather than re-throwing), the inner promise
        // always fulfils — which is exactly what keeps the outer Promise.all
        // from ever short-circuiting on a rejection.
        (value) => ({ status: "fulfilled", value }),
        (reason) => ({ status: "rejected", reason })
      )
    )
  );

  // Note the key shape difference the spec mandates: fulfilled entries carry
  // `value`, rejected entries carry `reason`, and neither has the other key.
  // Order matches the input order, as with Promise.all.
}

module.exports = promiseAllSettled;
