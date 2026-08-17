// Problem Description – Hedged Circuit Breaker
//
// You are required to implement circuitHedgedFetch(url, options).
//
// The function should perform a hedged request:
// start a primary fetch immediately, and if it does not respond within 200ms,
// start a backup fetch in parallel.
//
// Additionally, the function must include a circuit breaker mechanism.
// If the API fails repeatedly, the circuit breaker should open and future calls
// must fail fast without making network requests.
//
// While the circuit is OPEN, the function should immediately return a cached value
// instead of attempting the hedged network logic.

const HEDGE_DELAY_MS = 200; // how long to wait before firing the backup
const FAILURE_THRESHOLD = 3; // consecutive failures that trip the breaker
const RESET_TIMEOUT_MS = 5000; // cool-down before probing for recovery

function createCircuitHedgedFetch() {
  // State deliberately lives OUTSIDE the returned function, in the closure.
  // A circuit breaker is meaningless per-call: it only works by remembering
  // what happened across calls.
  let cbState = "CLOSED";
  let failureCount = 0;
  let lastFailureTime = null;
  let lastKnownGoodValue = null;

  return async function circuitHedgedFetch(url, options = {}) {
    // --- Circuit breaker gate -------------------------------------------------
    if (cbState === "OPEN") {
      if (Date.now() - lastFailureTime >= RESET_TIMEOUT_MS) {
        // Cool-down elapsed — allow one probe through to test for recovery.
        cbState = "HALF_OPEN";
      } else {
        // Serve the last good value INSTEAD of touching the network. This is
        // graceful degradation: the user sees slightly stale data rather than an
        // error, and the struggling upstream gets a complete break from us
        // instead of a continued barrage.
        if (lastKnownGoodValue !== null) return lastKnownGoodValue;
        throw new Error("Circuit is OPEN and no cached value is available");
      }
    }

    try {
      const data = await hedgedFetch(url, options);

      // Success resets everything. Note the counter tracks CONSECUTIVE failures,
      // so isolated blips amid healthy traffic never trip the breaker.
      failureCount = 0;
      cbState = "CLOSED";
      lastKnownGoodValue = data; // keep it for the next outage

      return data;
    } catch (err) {
      failureCount++;

      // A failed probe from HALF_OPEN re-opens immediately — we already know the
      // service is sick, so there's no reason to wait for the full threshold.
      if (cbState === "HALF_OPEN" || failureCount >= FAILURE_THRESHOLD) {
        cbState = "OPEN";
        lastFailureTime = Date.now();
      }

      throw err;
    }
  };
}

// The hedging half: race the primary against a delayed backup.
function hedgedFetch(url, options) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let backupStarted = false;
    let launched = 0; // how many copies of the request are in flight
    let failures = 0; // how many of them have failed
    let lastError = null;
    let timer;

    const finish = (err, value) => {
      if (settled) return; // first result wins; later arrivals are discarded
      settled = true;
      clearTimeout(timer);
      if (err) reject(err);
      else resolve(value);
    };

    const attempt = () => {
      launched++;
      fetch(url, options).then(
        async (response) => {
          if (settled) return;
          if (!response.ok) return handleFailure(new Error(`HTTP ${response.status}`));
          try {
            finish(null, await response.json());
          } catch (err) {
            handleFailure(err);
          }
        },
        (err) => handleFailure(err)
      );
    };

    const handleFailure = (err) => {
      if (settled) return;
      failures++;
      lastError = err;

      // The primary died before the hedge timer fired. No reason to wait out the
      // remaining delay — the rationale for waiting (don't add load while the
      // primary might still answer) no longer applies. Escalate immediately.
      if (!backupStarted) return startBackup();

      // Give up only once EVERY copy in flight has failed. A single failure may
      // just be one bad server in a pool, and the other copy may still succeed.
      if (failures >= launched) finish(lastError);
    };

    const startBackup = () => {
      if (backupStarted || settled) return;
      backupStarted = true;
      attempt();
    };

    // Fire the primary immediately.
    attempt();

    // Arm the hedge. If the primary answers first, finish() clears this and the
    // backup is never sent — so we pay for the extra request only when it is
    // actually needed.
    //
    // This is the "tail at scale" technique: a small amount of duplicated load
    // buys a dramatically better p99, because slow responses are usually caused
    // by one unlucky server (a GC pause, a cold cache, a noisy neighbour) rather
    // than by the request being inherently slow.
    timer = setTimeout(startBackup, HEDGE_DELAY_MS);
  });
}

// Export a single shared instance — the breaker's memory is the whole point.
module.exports = createCircuitHedgedFetch();
module.exports.createCircuitHedgedFetch = createCircuitHedgedFetch;
