// Problem Description – Hedged Request
//
// You have a Primary async source and a Secondary backup.
// Start the Primary immediately. If it is slow, start the Secondary.
//
// Return the first successful result and ignore the rest.
// Only fail if both fail, and ensure the callback runs once.
//
// Requirements:
// - Start Primary immediately.
// - Start Secondary after timeoutMs if needed.
// - First success wins.
// - Callback must be called exactly once.

function hedgedRequest(primary, secondary, timeoutMs, onComplete) {
  // "Hedging" is a real latency technique (Google's "tail at scale" paper):
  // instead of setting a hard timeout and failing, you fire a *second* copy of
  // the request once the first looks slow, and take whichever answers first.
  // It trades a little extra load for a much better p99 latency.

  let settled = false; // exactly-once latch for onComplete
  let secondaryStarted = false;
  let failures = 0; // we only truly fail when BOTH have failed
  let lastError = null;
  // Declared up front (not at the setTimeout call below) so that a source which
  // calls back *synchronously* can still clearTimeout(timer) without hitting a
  // temporal-dead-zone ReferenceError. `clearTimeout(undefined)` is a harmless no-op.
  let timer;

  const finish = (err, data) => {
    if (settled) return; // a winner was already declared — drop late arrivals
    settled = true;
    clearTimeout(timer); // stop the hedge from firing after we're done
    onComplete(err, data);
  };

  const handle = (err, data) => {
    if (settled) return;

    if (!err) {
      // First success wins, whichever source it came from.
      return finish(null, data);
    }

    // A failure alone is not fatal — the other source may still succeed.
    failures++;
    lastError = err;

    if (failures === 2) {
      // Both are dead. Report the most recent error.
      return finish(lastError, null);
    }

    // Primary failed early, before the hedge timer would have fired. There is no
    // point waiting out the remaining delay — the reason for the delay (don't
    // waste load while the primary might still answer) no longer applies.
    if (!secondaryStarted) {
      startSecondary();
    }
  };

  const startSecondary = () => {
    if (secondaryStarted || settled) return;
    secondaryStarted = true;
    secondary(handle);
  };

  // Fire the primary right away — no delay, this is the normal path.
  primary(handle);

  // Arm the hedge. If the primary answers before this fires, `finish` clears it
  // and the secondary is never even started (no wasted load).
  timer = setTimeout(startSecondary, timeoutMs);
}

module.exports = hedgedRequest;
