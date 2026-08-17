// Problem Description – Async Initialization Gate
//
// You are required to design a mechanism for APIs that depend on an
// asynchronous initialization step.
// Any calls made before initialization completes should be queued and
// executed only after the initialization finishes.
// Calls made after initialization should execute immediately.
//
// The initialization task and API functions must invoke callbacks when
// they complete.

class GuardedAPI {
  constructor() {
    this.ready = false; // has init finished successfully?
    this.initError = null; // if init failed, remember why
    this.pending = []; // calls that arrived before the gate opened
  }

  // Kick off the one-time async setup (open a DB connection, load a config,
  // fetch an auth token...). Everything submitted via call() before this
  // finishes is parked rather than executed against an uninitialised system.
  init(initTask) {
    initTask((err) => {
      if (err) {
        // Init failed permanently. We must still drain the queue — otherwise
        // every queued caller hangs forever with no callback and no error,
        // which is the worst possible failure mode (a silent deadlock).
        this.initError = err;
      } else {
        this.ready = true;
      }
      this._flush();
    });
  }

  call(apiFn, onComplete) {
    // Gate already resolved — no reason to queue, run straight through.
    if (this.ready) {
      return apiFn(onComplete);
    }
    if (this.initError) {
      return onComplete(this.initError);
    }

    // Still initialising: park the call. The closure captures both the function
    // and its callback so the pair can be replayed verbatim later.
    this.pending.push({ apiFn, onComplete });
  }

  _flush() {
    // Swap the queue out before iterating. If one of the flushed callbacks turns
    // around and calls call() again, it now takes the fast path (ready === true)
    // instead of mutating the array we are in the middle of walking.
    const queued = this.pending;
    this.pending = [];

    queued.forEach(({ apiFn, onComplete }) => {
      if (this.initError) return onComplete(this.initError);
      apiFn(onComplete);
    });
  }
}

module.exports = GuardedAPI;
