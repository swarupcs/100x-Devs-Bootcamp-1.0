// Problem Description – I/O Operation With Timeout
//
// You are given an asynchronous function that represents an I/O-bound task
// (such as a network request or database call).
//
// Your task is to execute this function, but enforce a time limit.
// If the I/O operation does not complete within the specified number
// of milliseconds, the returned promise should reject with a "Timeout" error.

async function ioWithTimeout(fn, ms) {
  let timer;

  // The "tripwire" promise — it has no resolve path at all, so its only possible
  // outcome is rejection at the deadline.
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject("Timeout"), ms);
  });

  try {
    // Start the I/O and the countdown together, then take whichever settles
    // first. If fn wins, its value (or its own error) passes through unchanged;
    // if the timer wins, the caller gets "Timeout".
    return await Promise.race([fn(), timeout]);
  } finally {
    // Always cancel the timer, on both paths. If fn wins the race and we leave
    // the timer armed, Node keeps the event loop alive until it fires — a
    // long-running program would accumulate one dangling timer per call, and a
    // short script would refuse to exit.
    clearTimeout(timer);
  }

  // Timeouts are especially important for I/O precisely because I/O is the part
  // you don't control: a TCP connection to an unresponsive host can hang for
  // minutes at the OS level. But remember this bounds the WAIT, not the WORK —
  // the socket stays open until fn itself gives up. Truly aborting the operation
  // needs cooperation from fn (e.g. an AbortSignal passed into fetch).
}

module.exports = ioWithTimeout;
