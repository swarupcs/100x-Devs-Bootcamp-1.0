// Problem Description – Atomic Multi-File Write (Transactional Write)
//
// You are given multiple files to write as part of one operation.
// Your task is to implement transactionalWrite(filesData).
//
// All file writes should be started in parallel.
// If any write fails, rollback by deleting any files that were successfully written.
// The promise should resolve only if all files are written successfully.
// If rollback occurs, the promise should reject with the original error.

const fs = require("fs").promises;

async function transactionalWrite(filesData) {
  // Fire every write CONCURRENTLY, then wait with allSettled rather than all().
  //
  // This choice is the crux. Promise.all would reject the moment the first write
  // fails, while sibling writes are still in flight — and we would then have no
  // idea which of them eventually succeeded, so we could not clean them up. That
  // leaks exactly the half-written state a transaction exists to prevent.
  //
  // allSettled waits for the complete picture: every write has finished, and we
  // know precisely which files exist on disk.
  const outcomes = await Promise.allSettled(
    filesData.map((file) => fs.writeFile(file.path, file.content))
  );

  const failure = outcomes.find((outcome) => outcome.status === "rejected");

  // Happy path — everything landed. Resolve with undefined; the caller's
  // guarantee is "all or nothing", and there is no meaningful value to return.
  if (!failure) return;

  // --- Rollback -------------------------------------------------------------
  // Delete only the files that were actually written. Indexes line up because
  // allSettled preserves input order.
  const writtenPaths = filesData
    .filter((_, i) => outcomes[i].status === "fulfilled")
    .map((file) => file.path);

  await Promise.allSettled(
    writtenPaths.map((path) =>
      // Each unlink is individually tolerant of failure: if one delete fails we
      // still want to attempt the rest, and a file that is already gone is a
      // success from the cleanup's point of view.
      //
      // Promise.resolve() wraps the call so the chain is safe even if unlink
      // returns something non-thenable — the cleanup path must never itself
      // throw and mask the real error we're about to report.
      Promise.resolve(fs.unlink(path)).catch(() => {})
    )
  );

  // Reject with the ORIGINAL write error, not a rollback error. The caller needs
  // to know why the operation failed ("Disk Full"); the cleanup is an internal
  // detail of restoring a clean state.
  throw failure.reason;

  // Honest caveat: this is atomic-ish, not truly atomic. A crash between the
  // failed write and the unlinks leaves debris behind. The bulletproof approach
  // is write-to-temp-then-rename, since rename is atomic at the filesystem level.
}

module.exports = transactionalWrite;
