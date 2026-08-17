// Problem Description – Resumable Async Map
//
// You are given an array of async tasks and a concurrency limit.
// Your task is to implement createResumableMapper(tasks, limit).
//
// The function must return an object with:
// 1. start(): starts/resumes processing and resolves when all tasks complete
// 2. pause(): stops scheduling new tasks (running tasks may finish)
// 3. getStatus(): returns progress info (completed, pending, running)
//
// When resumed, processing must continue from where it paused
// without re-running already completed tasks.

function createResumableMapper(tasks, limit) {
  const results = new Array(tasks.length);

  let nextIndex = 0; // cursor: the next task never yet dispatched
  let completed = 0;
  let running = 0;
  let paused = true; // nothing runs until start() is called
  let finishPromise = null;
  let resolveFinish = null;
  let rejectFinish = null;

  // Fill every free slot with work — subject to BOTH the concurrency limit and
  // the pause flag.
  function fill() {
    while (!paused && running < limit && nextIndex < tasks.length) {
      const index = nextIndex++;
      running++;

      Promise.resolve()
        .then(() => tasks[index]())
        .then(
          (value) => {
            results[index] = value;
            running--;
            completed++;

            if (completed === tasks.length) {
              return resolveFinish(results);
            }

            // A slot just freed — pull in more work (unless paused).
            fill();
          },
          (err) => {
            running--;
            if (rejectFinish) rejectFinish(err);
          }
        );
    }
  }

  return {
    start() {
      // The finish promise is created ONCE and returned by every start() call.
      // This is what makes resumption seamless: a caller who awaited the
      // original start() before a pause is still awaiting the same promise, and
      // it resolves when the work eventually completes — the pause is invisible
      // to them.
      if (!finishPromise) {
        finishPromise = new Promise((resolve, reject) => {
          resolveFinish = resolve;
          rejectFinish = reject;
        });
      }

      paused = false;

      // Resumption needs no special logic at all. Because `nextIndex` only ever
      // moves forward and lives in the closure, "continue where we left off" is
      // simply the natural consequence of calling fill() again — no task can be
      // re-run, because its index has already been consumed.
      fill();

      return finishPromise;
    },

    pause() {
      // Note what pause does NOT do: it cannot stop tasks that are already
      // running. Promises have no cancellation, so the honest semantics are
      // "stop SCHEDULING new work" — in-flight tasks run to completion and their
      // results are still recorded. This is why getStatus() can legitimately
      // report `running > 0` immediately after a pause.
      paused = true;
    },

    getStatus() {
      return {
        completed,
        running,
        // Not yet started and not currently running.
        pending: tasks.length - completed - running,
        paused,
      };
    },
  };
}

module.exports = createResumableMapper;
