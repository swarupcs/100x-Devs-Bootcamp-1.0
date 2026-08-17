// Problem Description – Fair Priority Task Scheduler (Starvation-Free)
//
// You are required to implement a task scheduler that supports priorities
// while ensuring fairness.
//
// Each task has a priority (higher number = higher priority).
// Normally, higher-priority tasks should run first.
//
// However, low-priority tasks must not starve forever.
// If a task waits too long, its effective priority should increase over time
// (priority aging).
//
// Requirements:
// 1. Higher-priority tasks should be preferred
// 2. Tasks must execute one at a time
// 3. Starvation must be prevented using priority aging
// 4. Tasks must execute asynchronously

class FairScheduler {
  constructor(agingFactor = 1) {
    // How much effective priority a task gains per millisecond of waiting.
    // This single number is the dial between two extremes:
    //   agingFactor = 0        -> pure priority queue; low tasks can starve forever
    //   agingFactor -> large   -> effectively FIFO; priority stops mattering
    this.agingFactor = agingFactor;
    this.queue = [];
    this.seq = 0;
  }

  schedule(task, priority = 0) {
    this.queue.push({
      task,
      priority,
      // Timestamp of admission — the basis for computing how long it has waited.
      enqueuedAt: Date.now(),
      seq: this.seq++,
    });
  }

  // Effective priority = declared priority + a bonus that grows with waiting time.
  //
  // This is the classic fix for the pathology of a naive priority queue: under a
  // steady stream of high-priority work, a low-priority task is passed over
  // every single time and waits forever. Real schedulers (Linux's CFS, Windows'
  // balance-set manager) all include some form of aging for exactly this reason.
  //
  // The elegant property is that fairness needs no special cases — the low task
  // simply keeps climbing until it out-ranks the newcomers on merit.
  _agedPriority(entry, now) {
    const waited = now - entry.enqueuedAt;
    return entry.priority + waited * this.agingFactor;
  }

  async run() {
    while (this.queue.length > 0) {
      const now = Date.now();

      // Recompute aged priorities at DISPATCH time, never at insert time. The
      // whole mechanism depends on it: a task's effective priority is a function
      // of how long it has been waiting, so any ranking decided earlier is
      // already stale.
      let bestIndex = 0;
      for (let i = 1; i < this.queue.length; i++) {
        const candidate = this._agedPriority(this.queue[i], now);
        const best = this._agedPriority(this.queue[bestIndex], now);

        // Ties broken by insertion order (seq), keeping the scheduler stable and
        // predictable for equal-priority work.
        if (
          candidate > best ||
          (candidate === best && this.queue[i].seq < this.queue[bestIndex].seq)
        ) {
          bestIndex = i;
        }
      }

      const { task } = this.queue.splice(bestIndex, 1)[0];

      try {
        // Requirement 2: strictly one at a time. Awaiting here also satisfies
        // requirement 4 — and it's the point at which newly scheduled tasks can
        // arrive and be considered on the next pass.
        await task();
      } catch {
        // One failing task must not abort the run and strand everything queued
        // behind it. The scheduler's job is to keep draining.
      }
    }
  }
}

module.exports = FairScheduler;
