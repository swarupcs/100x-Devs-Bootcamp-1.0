/*
    Write a function that returns a promise that resolves after n seconds have passed, where n is passed as an argument to the function.
*/

function wait(n) {
  // "Promisifying" a callback API means wrapping it so it returns a promise
  // instead of taking a callback. setTimeout is the canonical example, and this
  // little function is the foundation for almost every async utility you'll
  // write later (retries, timeouts, polling, rate limiters all need a delay).
  const p = new Promise((resolve) => {
    // The executor passed to `new Promise` runs SYNCHRONOUSLY, right now. What
    // it does is schedule the timer and then return — capturing `resolve` in the
    // timer's closure so it can be called later.
    //
    // That deferral is the whole trick: the promise is returned in a PENDING
    // state, and the value only arrives when the timer fires. Holding onto
    // `resolve` and calling it from a future callback is the fundamental pattern
    // for bridging any callback-based API into the promise world.
    setTimeout(() => {
      // resolve() with no argument fulfils the promise with `undefined`, which
      // is what the test asserts (`.resolves.toBeUndefined()`). We're signalling
      // "the wait is over" — there is no value to deliver, only a completion.
      resolve();
    }, n * 1000); // the argument is in SECONDS; setTimeout expects milliseconds
  });

  return p;

  // Contrast this with 2-sleep-completely.js, which achieves the same delay by
  // blocking. Here the thread is released the instant this function returns:
  // other timers fire, I/O completes, and the rest of the program keeps running
  // during the wait. That's the difference between waiting and blocking.
  //
  // Note also why the elapsed time is always ">= n seconds" and never exactly n:
  // the timer only becomes ELIGIBLE to run at that point. If the event loop is
  // busy with something else when it expires, the callback waits its turn.
}

module.exports = wait;
