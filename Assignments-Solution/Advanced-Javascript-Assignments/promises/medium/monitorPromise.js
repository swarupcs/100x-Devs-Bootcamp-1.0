// Problem Description – Hanging Promise Detector
//
// You are given a promise, a threshold time in milliseconds, and a callback onHang.
// Your task is to implement monitorPromise(promise, onHang, thresholdMs).
//
// If the promise does not settle within thresholdMs, call onHang().
// The original promise should continue normally (do not cancel it).
// If the promise settles before thresholdMs, onHang must not be called.

function monitorPromise(promise, onHang, thresholdMs) {
  // Note what this is NOT: it is not a timeout. A timeout REPLACES the outcome
  // with an error; this only OBSERVES. The returned promise still settles with
  // the original's value or reason, whenever that happens.
  //
  // That's the useful distinction in production monitoring: you want to know
  // that a request has gone quiet (log it, page someone, show a "still working…"
  // spinner) without abandoning work that may yet succeed.
  const timer = setTimeout(() => {
    onHang();
  }, thresholdMs);

  return promise.finally(() => {
    // Disarm the alarm the moment the promise settles — success or failure
    // alike. Two reasons this must be on BOTH paths:
    //
    //   1. Correctness: a promise that REJECTS quickly has not hung, so firing
    //      onHang afterwards would be a false alarm.
    //   2. Hygiene: a live timer keeps the Node event loop alive and holds the
    //      onHang closure in memory. One leaked timer per monitored request adds
    //      up fast in a server.
    clearTimeout(timer);
  });

  // .finally() is exactly the right tool: it observes the settlement without
  // altering it — the value passes through and a rejection stays a rejection.
  // Using .then(clear, clear) would work too, but .catch(clear) alone would
  // swallow the error and silently convert failures into successes.
}

module.exports = monitorPromise;
