// Problem Description – Abortable Promise Wrapper
//
// You are required to wrap a Promise so that it can be cancelled using an AbortSignal.
// If the signal is aborted before the Promise settles, the wrapper should immediately
// reject with an appropriate error.
// If not aborted, it should resolve or reject normally.

function makeCancellable(promise, signal) {
  return new Promise((resolve, reject) => {
    const abortError = () => new Error("Aborted");

    // Case 1: the signal was ALREADY aborted before we got here. There is no
    // future "abort" event to listen for — it has been and gone — so a listener
    // alone would hang forever. Checking the current state first is essential.
    if (signal.aborted) {
      return reject(abortError());
    }

    const onAbort = () => reject(abortError());

    // Case 2: abort arrives while the promise is still pending. Because a
    // promise settles exactly once, whichever fires first — this listener or the
    // handlers below — wins, and the loser becomes a silent no-op. No manual
    // latch required.
    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (err) => {
        signal.removeEventListener("abort", onAbort);
        reject(err); // a genuine failure propagates unchanged
      }
    );

    // Removing the listener on settlement is not just tidiness: the signal may
    // outlive this call (one controller often guards many operations), and every
    // stale listener holds its closure — and the promise it captures — alive.
    // That's a real memory leak in a long-running request.
    //
    // The honest caveat: this cancels the WAITING, not the WORK. The wrapped
    // promise keeps running; we simply stop listening to it. Real cancellation
    // requires the underlying operation to accept the signal itself — which is
    // exactly why fetch() takes `{ signal }` rather than leaving you to wrap it.
  });
}

module.exports = makeCancellable;
