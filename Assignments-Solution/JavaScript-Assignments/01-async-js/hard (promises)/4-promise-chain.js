/*
 * Write 3 different functions that return promises that resolve after t1, t2, and t3 seconds respectively.
 * Write a function that sequentially calls all 3 of these functions in order.
 * Return a promise chain which return the time in milliseconds it takes to complete the entire operation.
 * Compare it with the results from 3-promise-all.js
 */

function wait1(t) {
  return new Promise((resolve) => setTimeout(resolve, t * 1000));
}

function wait2(t) {
  return new Promise((resolve) => setTimeout(resolve, t * 1000));
}

function wait3(t) {
  return new Promise((resolve) => setTimeout(resolve, t * 1000));
}

function calculateTime(t1, t2, t3) {
  const startTime = Date.now();

  // A PROMISE CHAIN. The difference from 3-promise-all.js is subtle in
  // appearance and enormous in effect: notice that wait2 and wait3 are not
  // CALLED here. They're called later, from inside a .then() handler — so their
  // timers don't even start until the previous promise has resolved.
  //
  // In 3-promise-all.js all three were invoked on one line, starting three
  // timers at once. Here they start one after another, so the durations ADD UP:
  // total = t1 + t2 + t3.
  //
  //   For (1, 2, 3):  chain ~6000ms  vs  Promise.all ~3000ms
  //   For (10, 1, 1): chain ~12000ms vs  Promise.all ~10000ms
  return wait1(t1)
    .then(() => {
      // RETURNING the promise is what makes the chain sequential. The next
      // .then() in the chain waits for this returned promise to settle before
      // running.
      //
      // Forget the `return` and the chain breaks silently: the handler would
      // resolve with `undefined` immediately, the next step would fire right
      // away, and all three waits would overlap by accident — producing a
      // measured time of ~t1 instead of the sum. This is the single most common
      // promise-chaining bug, and it's nasty precisely because nothing errors.
      return wait2(t2);
    })
    .then(() => {
      return wait3(t3);
    })
    .then(() => {
      // Only now, after all three waits have completed one after another, do we
      // measure. The returned value becomes the resolution of the whole chain.
      return Date.now() - startTime;
    });

  // WHEN IS THIS THE RIGHT CHOICE? Sequential execution is strictly slower, so
  // it needs a reason:
  //   - a later step needs an earlier step's RESULT (fetch a user, then fetch
  //     that user's posts — you can't start the second without the first)
  //   - the operations have ORDERING side effects (write, then read back)
  //   - you're deliberately pacing a rate-limited API
  //
  // If none of those apply and the operations are independent, Promise.all is
  // simply better. The equivalent async/await form of this chain is:
  //
  //     await wait1(t1);
  //     await wait2(t2);
  //     await wait3(t3);
  //
  // which is why "await in a loop" is a performance smell — it's this same
  // serialisation, usually applied by accident.
}

module.exports = calculateTime;
