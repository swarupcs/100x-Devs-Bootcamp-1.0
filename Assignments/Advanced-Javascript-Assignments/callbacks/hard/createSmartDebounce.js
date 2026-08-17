// Problem Description – Debounced Search with Result Guard
//
// You are building a search bar that should not call the API
// on every keystroke, so the request must be debounced.
//
// If an older request finishes after a newer one, its result
// must be ignored to prevent stale UI updates.
//
// Requirements:
// - Delay execution by waitMs.
// - Reset the timer on repeated calls.
// - Only the latest request may trigger the callback.

function createSmartDebounce(worker, waitMs) {
  let timer = null; // the pending (not yet fired) invocation
  let latestId = 0; // monotonic ticket number identifying the newest request

  return function debounced(input, onComplete) {
    // --- Layer 1: debounce ---------------------------------------------------
    // Cancel any invocation that hasn't fired yet and restart the clock. This is
    // what collapses a burst of keystrokes into a single API call: only a pause
    // of `waitMs` with no new input lets a request through.
    if (timer) clearTimeout(timer);

    timer = setTimeout(() => {
      timer = null;

      // --- Layer 2: the stale-result guard -----------------------------------
      // Debouncing alone is not enough. Once a request has actually been sent it
      // can no longer be cancelled, so if the user types again the older, slower
      // request may still land *after* the newer one — and overwrite fresh
      // results with stale ones. (This is the classic "race condition in a
      // search box" bug.)
      //
      // The fix is a ticket: each fired request captures the id it had at launch
      // and, on completion, checks whether it is still the newest. If not, its
      // result is silently dropped and the callback is never invoked.
      const myId = ++latestId;

      worker(input, (err, data) => {
        if (myId !== latestId) return; // superseded — discard
        onComplete(err, data);
      });
    }, waitMs);
  };
}

module.exports = createSmartDebounce;
