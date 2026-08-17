// Problem Description – Circuit Breaker Promise Wrapper
//
// You are given an async function fn that may fail.
// Your task is to implement circuitBreaker(fn, failureThreshold, resetTimeout).
//
// The circuit breaker must track consecutive failures and manage states:
//
// 1. CLOSED: calls execute normally
// 2. OPEN: after failureThreshold failures, reject immediately without calling fn
// 3. HALF-OPEN: after resetTimeout, allow one trial call to check recovery
//
// If the trial succeeds, reset to CLOSED.
// If it fails, return to OPEN.

function circuitBreaker(fn, failureThreshold, resetTimeout) {
  // The metaphor is electrical: when the current gets dangerous, the breaker
  // trips and the circuit opens, cutting the connection until someone resets it.
  //
  // The problem it solves: when a dependency is down, retrying it is worse than
  // useless. Every doomed call still costs a connection, a thread, and a full
  // timeout — so a failing dependency drags its callers down with it, and they
  // drag THEIR callers down. That is a cascading failure. Failing fast contains
  // the blast radius and, just as importantly, stops hammering a service that is
  // trying to recover.
  let state = "CLOSED";
  let failures = 0;
  let openedAt = null;

  return async function (...args) {
    // --- OPEN: fail fast, don't even try -------------------------------------
    if (state === "OPEN") {
      // Has the cool-down elapsed? If so, move to HALF_OPEN and let exactly one
      // request through as a probe.
      if (Date.now() - openedAt >= resetTimeout) {
        state = "HALF_OPEN";
      } else {
        // Reject WITHOUT calling fn. This is the entire value proposition:
        // the caller gets an instant, cheap failure instead of waiting out a
        // timeout against a service we already know is down.
        throw new Error("Circuit is OPEN");
      }
    }

    try {
      const result = await fn(...args);

      // Success. From HALF_OPEN this is the recovery signal: close the circuit
      // and resume normal service. From CLOSED it simply resets the counter —
      // note the threshold counts CONSECUTIVE failures, so an occasional blip
      // among healthy traffic never trips the breaker.
      failures = 0;
      state = "CLOSED";

      return result;
    } catch (err) {
      failures++;

      // A failed probe sends us straight back to OPEN and restarts the
      // cool-down. Crucially it does NOT need to re-reach the threshold: we
      // already know the service is unhealthy, and letting a stream of probes
      // through would defeat the purpose.
      if (state === "HALF_OPEN" || failures >= failureThreshold) {
        state = "OPEN";
        openedAt = Date.now();
      }

      // Propagate the real error. The breaker changes WHETHER we call, never
      // what the call reported.
      throw err;
    }
  };

  // State machine summary:
  //
  //   CLOSED --(failures >= threshold)--> OPEN
  //   OPEN --(resetTimeout elapsed)--> HALF_OPEN   [one trial call allowed]
  //   HALF_OPEN --(trial succeeds)--> CLOSED
  //   HALF_OPEN --(trial fails)--> OPEN            [cool-down restarts]
  //
  // HALF_OPEN is what makes this self-healing: recovery is detected
  // automatically by a single cheap probe, with no human intervention and
  // without flooding the recovering service.
}

module.exports = circuitBreaker;
