// Problem Description – Preemptive Priority Mutex
//
// You are required to implement a PriorityMutex that allows only one async task
// to hold a lock at a time.
//
// Each lock request includes a priority (higher is better).
// High-priority tasks should jump ahead of lower-priority tasks.
//
// To prevent starvation, tasks waiting longer than 5 seconds must gain priority
// (priority aging) and eventually move ahead in the queue.
//
// lock(task, priority) runs the task when it acquires the lock and returns a Promise.

const AGING_INTERVAL_MS = 5000; // every 5s of waiting is worth +1 priority

class PriorityMutex {
  constructor() {
    this.locked = false;
    this.queue = []; // waiters: { task, basePriority, enqueuedAt, seq, resolve, reject }
    this.seq = 0;
  }

  // Effective priority grows the longer a task has been waiting.
  //
  // Without this, a mutex under a steady stream of high-priority requests would
  // let a low-priority waiter sit in the queue forever — it loses every single
  // comparison. Aging guarantees that any waiter eventually out-ranks the
  // newcomers purely by virtue of having waited, which converts "probably runs
  // eventually" into a real liveness guarantee.
  _getAgedPriority(waiter) {
    const waited = Date.now() - waiter.enqueuedAt;
    return waiter.basePriority + waited / AGING_INTERVAL_MS;
  }

  lock(task, basePriority = 0) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task,
        basePriority,
        enqueuedAt: Date.now(),
        seq: this.seq++,
        resolve,
        reject,
      });

      // Only start a dispatch if the mutex is idle; otherwise the running task's
      // release will pick up the queue.
      if (!this.locked) this._next();
    });
  }

  _next() {
    if (this.queue.length === 0) {
      this.locked = false;
      return;
    }

    // Select at DISPATCH time. This is what "preemptive" means in practice here:
    // a high-priority request that arrived while the previous task was running
    // jumps the whole queue.
    //
    // What it explicitly does NOT do is interrupt the RUNNING task. JavaScript
    // has no preemption — a function owns the thread until it awaits or returns
    // — so the highest-priority waiter still has to wait out the current holder.
    // "Preemptive" here means preempting the QUEUE, not the CPU.
    let bestIndex = 0;
    for (let i = 1; i < this.queue.length; i++) {
      const candidate = this._getAgedPriority(this.queue[i]);
      const best = this._getAgedPriority(this.queue[bestIndex]);
      if (
        candidate > best ||
        (candidate === best && this.queue[i].seq < this.queue[bestIndex].seq)
      ) {
        bestIndex = i;
      }
    }

    const waiter = this.queue.splice(bestIndex, 1)[0];

    this.locked = true;
    this._execute(waiter.task, waiter.resolve, waiter.reject);
  }

  async _execute(task, resolve, reject) {
    try {
      resolve(await task());
    } catch (err) {
      reject(err);
    } finally {
      // Release in `finally` — non-negotiable. If a task throws and we only
      // released on the success path, the mutex would stay locked forever and
      // every queued task would hang with no error: a silent deadlock, the
      // nastiest failure mode a lock can have.
      this._next();
    }
  }
}

module.exports = PriorityMutex;
