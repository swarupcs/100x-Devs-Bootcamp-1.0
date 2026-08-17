// Problem Description – batchAll(tasks, batchSize)
//
// You are required to implement a function named batchAll that processes an array of
// asynchronous tasks in fixed-size batches.
// Each batch should execute its tasks concurrently, but the next batch must not start
// until all tasks in the current batch have completed.

async function batchAll(tasks, batchSize) {
  const results = [];

  // Walk the task list one fixed-size window at a time.
  for (let i = 0; i < tasks.length; i += batchSize) {
    const batch = tasks.slice(i, i + batchSize);

    // WITHIN a batch: full parallelism. Every task is invoked in the same tick
    // and Promise.all waits for the whole group, so the batch costs
    // max(durations) rather than their sum.
    //
    // BETWEEN batches: a hard barrier. The `await` means batch N+1's tasks are
    // not even CALLED until every member of batch N has settled.
    const batchResults = await Promise.all(batch.map((task) => task()));

    // Concatenating in loop order keeps the output aligned with the input, since
    // Promise.all already preserves order within each batch.
    results.push(...batchResults);
  }

  return results;

  // How this differs from mapAsyncLimit / taskScheduler — worth understanding,
  // because they look superficially similar:
  //
  //   batchAll   : lock-step barriers. A slow task stalls the whole batch, so
  //                some workers sit idle waiting for it. Choose this when the
  //                barrier is the POINT — e.g. each batch is a transaction, or
  //                a downstream system needs the previous group fully flushed.
  //
  //   mapAsyncLimit: rolling window. A finished worker immediately claims the
  //                next item, so the pipeline stays saturated. Choose this when
  //                you only care about capping concurrency (better throughput).
  //
  // Failure semantics here: Promise.all rejects on the first failure in a batch,
  // so batchAll rejects and no LATER batch is started at all.
}

module.exports = batchAll;
