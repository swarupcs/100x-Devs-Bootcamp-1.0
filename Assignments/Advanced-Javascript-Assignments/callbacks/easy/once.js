// Problem Description – once(fn)
//
// You are required to implement a wrapper function named once that accepts a
// callback-based asynchronous function `fn`.
// The wrapper should ensure that `fn` is executed only on the first call.
// Any subsequent calls should not re-execute `fn` and should instead invoke
// the callback with the same result (or error) from the first invocation.

function once(fn) {
  // Three pieces of state live in the closure, shared by every call to the
  // returned wrapper. This is the classic "memoize an async operation" shape.
  let called = false; // has `fn` been kicked off yet?
  let settled = false; // has `fn`'s callback already fired?
  let result = null; // the cached [err, data] tuple once settled
  let waiting = []; // callbacks that arrived while the call was in flight

  return function (...args) {
    const callback = args.pop();

    // Case 1 — the work already finished. Replay the cached outcome.
    // We still defer with setTimeout so the wrapper is *consistently* async:
    // a function that sometimes calls back synchronously and sometimes not is
    // a classic source of bugs (Zalgo), because the caller can't tell whether
    // code after the call has run yet.
    if (settled) {
      return setTimeout(() => callback(...result), 0);
    }

    // Case 2 — the work is in flight (a second caller arrived before the first
    // finished). We must NOT re-run `fn`; we park this callback in a queue and
    // flush it when the single underlying call settles.
    if (called) {
      return waiting.push(callback);
    }

    // Case 3 — first ever call. Flip the flag *before* invoking `fn`, so that a
    // synchronous re-entrant call from inside `fn` still takes the queue path.
    called = true;
    waiting.push(callback);

    fn(...args, (...outcome) => {
      settled = true;
      result = outcome; // cache the full argument list, e.g. [null, 4]

      // Drain the queue. Swapping to a fresh array first prevents an infinite
      // loop if one of these callbacks calls the wrapper again.
      const pending = waiting;
      waiting = [];
      pending.forEach((cb) => cb(...result));
    });
  };
}

module.exports = once;
