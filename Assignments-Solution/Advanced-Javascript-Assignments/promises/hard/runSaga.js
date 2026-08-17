// Problem Description – Atomic Multi-Stage Saga (Recovery)
//
// You are required to implement runSaga(stages).
//
// Each stage contains:
// { action: () => Promise, undo: () => Promise }
//
// The stages must run sequentially.
// If any stage action fails, you must rollback by calling undo() for all
// previously completed stages in reverse order.
//
// Requirements:
// 1. Execute all actions in order
// 2. On failure, rollback completed actions using undo() (reverse order)
// 3. If an undo fails, reject with "Critical Failure" including both
//    the original error and undo error

async function runSaga(stages) {
  // Track which stages actually succeeded — only those need undoing. The stage
  // that FAILED is not in here, which is correct: its action never completed, so
  // there is nothing of its to roll back.
  const completed = [];

  try {
    for (const stage of stages) {
      await stage.action();
      completed.push(stage);
    }

    return; // every stage succeeded — the saga is committed
  } catch (originalError) {
    // --- Compensating transactions -------------------------------------------
    // The Saga pattern is how you get atomicity across systems that have no
    // shared transaction — charge a card, reserve inventory, book a seat, each
    // in a different service. You cannot ROLL BACK a committed remote call, so
    // instead you issue a semantically opposite one: refund, un-reserve, cancel.
    //
    // REVERSE order matters and is not cosmetic. Later stages may depend on
    // state created by earlier ones, so undoing forwards could try to remove a
    // record while something built on top of it still exists. Unwinding in
    // reverse mirrors how the state was built up — the same reason a call stack
    // unwinds last-in-first-out.
    for (let i = completed.length - 1; i >= 0; i--) {
      try {
        await completed[i].undo();
      } catch (undoError) {
        // --- The unrecoverable case ----------------------------------------
        // The action failed AND the compensation for it failed. The system is
        // now in a genuinely inconsistent state that code cannot repair — a
        // charge may have gone through with no matching order.
        //
        // The only correct response is to fail loudly, carrying BOTH errors:
        // the original cause and the rollback failure. Swallowing either one
        // leaves whoever investigates unable to reconstruct what happened. In
        // production this is the signal that fires a page to a human.
        const critical = new Error(
          `Critical Failure: ${originalError.message} | Undo Error: ${undoError.message}`
        );
        critical.originalError = originalError;
        critical.undoError = undoError;
        throw critical;
      }
    }

    // Rollback succeeded: the system is consistent again, so the caller sees the
    // ORIGINAL failure — the thing they actually need to know about. The
    // rollback is an implementation detail of getting back to a clean state.
    throw originalError;
  }
}

module.exports = runSaga;
