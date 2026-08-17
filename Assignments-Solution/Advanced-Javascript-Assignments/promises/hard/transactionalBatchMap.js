// Problem Description – Resilient Snapshot Parallel Batcher
//
// You are given a list of items to process in batches with a concurrency limit.
// Your task is to implement transactionalBatchMap(items, limit, uploadFn, deleteFn).
//
// Requirements:
// 1. Upload items in parallel with concurrency limit
// 2. If any upload fails, stop scheduling new uploads
// 3. Abort/stop the current batch as soon as possible
// 4. Rollback by calling deleteFn on all successfully uploaded items
// 5. Resolve only if all uploads succeed, otherwise reject after cleanup

async function transactionalBatchMap(items, limit, uploadFn, deleteFn) {
  const results = new Array(items.length);
  const uploaded = []; // items that landed successfully — the rollback list

  let nextIndex = 0;
  let failure = null; // first error seen; also the "stop scheduling" flag

  // Standard rolling-window worker, with one addition: the loop condition also
  // checks `failure`. That is requirement 2 — once anything fails, workers stop
  // claiming new items, so we don't keep uploading data we are about to delete.
  async function worker() {
    while (nextIndex < items.length && !failure) {
      const index = nextIndex++;
      const item = items[index];

      try {
        const result = await uploadFn(item);
        results[index] = result;

        // Record for potential rollback. Note we track the ITEM, since deleteFn
        // is defined in terms of items.
        uploaded.push(item);
      } catch (err) {
        // Keep only the FIRST error — it is the actual cause. Later failures are
        // usually just fallout.
        if (!failure) failure = err;
        // Fall out of the loop; the other workers will notice `failure` too.
        return;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);

  // allSettled, not all(). We must wait for EVERY in-flight upload to finish
  // before rolling back, even after we know we're doomed.
  //
  // This is the subtle part of requirement 4. Uploads already in flight when the
  // failure occurred will still succeed a moment later; if we rolled back
  // immediately we would miss them and leave orphaned data behind. The rollback
  // list is only complete once the dust has settled — hence "snapshot".
  await Promise.allSettled(workers);

  if (failure) {
    // --- Rollback ---------------------------------------------------------
    // Delete everything that made it. Individually tolerant: one failed delete
    // must not prevent the others from being attempted.
    await Promise.allSettled(uploaded.map((item) => deleteFn(item)));

    // Report the original upload error — the caller's guarantee is all-or-
    // nothing, and the cleanup is an internal detail.
    throw failure;
  }

  return results; // index-keyed, so output order matches input order
}

module.exports = transactionalBatchMap;
