// Problem Description – Abortable Async Pipeline
//
// You are required to implement an async pipeline that executes
// an array of async functions sequentially (waterfall execution).
//
// The pipeline must support cancellation using AbortController.
// If the abort signal is triggered:
// 1. Execution must stop immediately
// 2. Any pending async operation should be aborted
// 3. The pipeline must throw an AbortError

async function runPipeline(fns, signal) {
  const abortError = () => {
    const err = new Error("AbortError: pipeline aborted");
    err.name = "AbortError";
    return err;
  };

  let value = undefined;

  for (const fn of fns) {
    // --- Checkpoint BEFORE each stage ---------------------------------------
    // This is where cancellation actually takes effect. JS cannot interrupt a
    // running function, so a pipeline is cancelled at its SEAMS: at every stage
    // boundary we ask "are we still wanted?" before committing to more work.
    //
    // The finer the stages, the more responsive the cancellation — which is a
    // good argument for decomposing long pipelines.
    if (signal.aborted) throw abortError();

    // Pass the signal into the stage so it can cooperate — e.g. hand it to
    // fetch(), or poll it inside a loop. Requirement 2 ("pending operations
    // should be aborted") can only be honoured with the stage's cooperation;
    // there is no way to forcibly kill a promise from the outside.
    value = await fn(value, signal);

    // --- Checkpoint AFTER each stage ----------------------------------------
    // Essential, and easy to omit. A stage may abort the controller itself
    // (as the test does) or the abort may land while the stage was awaiting.
    // Without this second check the pipeline would happily march into the next
    // stage despite having been cancelled mid-flight.
    if (signal.aborted) throw abortError();
  }

  return value;

  // Note the waterfall shape: each stage receives the previous stage's output,
  // so execution is necessarily sequential — stage N+1 has no input until stage
  // N produces it.
}

module.exports = runPipeline;
