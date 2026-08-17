// Problem Description – everyAsync(array, predicate)
//
// You are required to implement a function named everyAsync that accepts an array and an
// asynchronous predicate function.
// The function should evaluate the predicate for each element and resolve to true only if
// all predicates return true.
// The evaluation should stop immediately and resolve to false as soon as any predicate fails.

async function everyAsync(array, predicate) {
  for (const item of array) {
    // Sequential evaluation is REQUIRED here, not just convenient. The
    // short-circuit guarantee ("stop as soon as one fails") is only meaningful
    // if later predicates haven't already been invoked — and a Promise.all-based
    // version would fire every predicate up front, so a failure at index 1 would
    // still have run indices 2 and 3.
    //
    // That matters whenever the predicate has a cost or a side effect: a
    // permission check that hits the database, a validation that logs, a probe
    // that costs money per call.
    //
    // `await` handles a synchronous predicate transparently — a plain boolean is
    // simply awaited as an already-resolved value.
    const passed = await predicate(item);

    if (!passed) return false;
  }

  // Vacuous truth: "every element of an empty set satisfies P" is true by
  // definition, and the loop never runs so the predicate is never called. This
  // matches the behaviour of the built-in Array.prototype.every.
  return true;

  // Note the deliberate difference from `false`: if the predicate THROWS we do
  // not treat it as a failed check. The error propagates to the caller, because
  // "the check errored" and "the check returned false" are different facts and
  // conflating them hides bugs.
}

module.exports = everyAsync;
