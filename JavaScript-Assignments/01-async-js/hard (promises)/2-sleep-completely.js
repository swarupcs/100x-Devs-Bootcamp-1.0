/*
 * Write a function that halts the JS thread (make it busy wait) for a given number of milliseconds.
 * During this time the thread should not be able to do anything else.
 * the function should return a promise just like before
 */

function sleep(milliseconds) {
  return new Promise((resolve) => {
    // A BUSY WAIT (spin loop). Read this alongside 1-promisify-setTimeout.js —
    // the two files look similar and behave in completely opposite ways, which
    // is exactly the point of the exercise:
    //
    //   wait(n)  -> setTimeout. NON-blocking. The function returns immediately,
    //               the thread is released, and other timers/I-O keep running
    //               while we wait.
    //
    //   sleep(n) -> this loop. BLOCKING. The thread is pinned at 100% CPU doing
    //               nothing but re-reading the clock. Nothing else can run:
    //               no timers, no I/O callbacks, not even promise microtasks,
    //               because the event loop only gets a turn once the call stack
    //               unwinds — and this loop never unwinds until it's done.
    //
    // "The thread should not be able to do anything else" is the requirement, so
    // blocking is the intended behaviour here. In real code this is almost
    // always a bug: in a server it freezes every concurrent request, and in a
    // browser it freezes the UI (no clicks, no repaints).
    const start = Date.now();

    while (Date.now() - start < milliseconds) {
      // Intentionally empty — the condition IS the work.
    }

    // The promise wrapper is worth thinking about: it makes sleep() awaitable
    // and so gives it the same call shape as a genuinely async function. But it
    // does NOT make it asynchronous. The blocking has already finished by the
    // time resolve() is called, since the executor function runs synchronously.
    //
    // In other words, `await sleep(1000)` and `sleep(1000)` block the thread for
    // a full second either way. The promise is a costume, not a change in
    // behaviour — which is a genuinely useful thing to understand about async
    // APIs in general.
    resolve();
  });
}

module.exports = sleep;
