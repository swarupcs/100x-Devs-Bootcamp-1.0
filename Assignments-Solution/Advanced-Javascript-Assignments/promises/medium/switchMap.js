// Problem Description – switchMap(apiCall)
//
// You are required to implement a utility function named switchMap to handle rapidly
// triggered asynchronous requests, such as those from a search input.
// When multiple calls are made in quick succession, only the result of the most recent
// call should be used.
// If an earlier request resolves after a later one, its result must be ignored.

function switchMap(apiCall) {
  // A monotonically increasing ticket number identifying the newest request.
  let latestCallId = 0;

  return async function (...args) {
    // Claim a ticket for THIS invocation. Because ++ happens before any await,
    // the assignment is atomic with respect to other calls — no two invocations
    // can hold the same id.
    const myCallId = ++latestCallId;

    let result;
    try {
      result = await apiCall(...args);
    } catch (err) {
      // A failure from a SUPERSEDED call is not the caller's problem — nobody is
      // watching that query any more, and surfacing it would produce a spurious
      // error toast for a search term the user has already moved past. Only the
      // newest call is allowed to report a failure.
      if (myCallId !== latestCallId) return undefined;
      throw err;
    }

    // By the time we get here, other calls may have been made. If our ticket is
    // no longer the newest, we have been superseded: resolve with `undefined`
    // rather than the stale value.
    //
    // This is the fix for the classic search-box race. Type "a", then "ab": the
    // request for "a" may well return AFTER the one for "ab" (different server
    // load, different cache state). Without this guard the UI would end up
    // showing results for "a" under the query "ab" — data that is not wrong so
    // much as belonging to a moment that has passed.
    //
    // The name comes from RxJS's switchMap operator, which does the same thing:
    // each new source value "switches" to a new inner stream and unsubscribes
    // from the previous one.
    if (myCallId !== latestCallId) {
      return undefined;
    }

    return result;

    // Note where the check sits: AFTER the await, not before. The stale request
    // still runs to completion (we have no way to cancel it); we simply decline
    // to report its answer. Errors from a superseded call are likewise dropped
    // by never reaching here — only the latest call's rejection propagates,
    // which is what the caller actually cares about.
  };
}

module.exports = switchMap;
