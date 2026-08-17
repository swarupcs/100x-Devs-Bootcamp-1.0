// Problem Description – Async Gate (Barrier Synchronization)
//
// You are required to implement a Barrier that blocks async execution
// until it is opened.
//
// The Barrier must provide:
// 1. wait(): returns a Promise that stays pending until the barrier is opened
// 2. open(): resolves all waiting Promises and opens the barrier
//
// If wait() is called after the barrier is already open,
// it should resolve immediately.

class Barrier {
  constructor() {
    this.isOpen = false;
    this.waiters = []; // stored `resolve` functions of pending wait() calls
  }

  wait() {
    // Once open, the barrier stays open — it's a one-way latch. Late arrivals
    // must not block, because there will never be another open() to release
    // them, and they'd hang forever.
    if (this.isOpen) {
      return Promise.resolve();
    }

    // The deferred pattern: build a promise and DON'T resolve it — stash the
    // resolve function instead. The promise stays pending (so the caller's
    // `await` genuinely suspends) until open() reaches in and invokes it.
    //
    // This is the fundamental technique for turning "an event that will happen
    // later" into something awaitable, and it's how every promise-based
    // synchronisation primitive is built.
    return new Promise((resolve) => {
      this.waiters.push(resolve);
    });
  }

  open() {
    if (this.isOpen) return; // idempotent: opening twice is harmless
    this.isOpen = true;

    // Swap the array out before draining it. If one of the released tasks
    // synchronously calls wait() again, it now takes the fast path above rather
    // than pushing onto the array we're mid-iteration over.
    const waiters = this.waiters;
    this.waiters = [];

    // Release EVERYONE at once — that's what makes it a barrier rather than a
    // queue. A mutex hands the baton to one waiter at a time; a barrier drops
    // the gate and lets the whole crowd through together.
    //
    // Classic uses: hold every request until config has loaded, until a DB
    // connection is established, or until a feature flag has been fetched.
    waiters.forEach((resolve) => resolve());

    // Note the released tasks resume on the microtask queue, not synchronously
    // inside this call — so open() returns before any of them actually continue.
  }
}

module.exports = Barrier;
