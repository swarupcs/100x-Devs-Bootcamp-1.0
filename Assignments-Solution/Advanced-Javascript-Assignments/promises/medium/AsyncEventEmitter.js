// Problem Description – Async Observer Event Emitter
//
// You are required to implement an AsyncEventEmitter that supports async listeners.
//
// The emitter must provide:
// 1. on(event, listener): register an async listener for an event
// 2. emit(event, data): trigger all listeners for that event
//
// The emit() method must return a Promise that resolves only after all listeners
// have finished execution (use Promise.allSettled).

class AsyncEventEmitter {
  constructor() {
    this.listeners = new Map(); // event name -> array of listener functions
  }

  on(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(listener);

    return this; // allow chaining: emitter.on(...).on(...)
  }

  emit(event, data) {
    const handlers = this.listeners.get(event) || [];

    // Copy the array before iterating. A listener that calls on() or off()
    // during emit would otherwise mutate the collection we're walking — a
    // classic source of skipped or double-invoked handlers.
    const snapshot = [...handlers];

    return Promise.allSettled(
      // Every listener is invoked in the SAME tick, so they run concurrently
      // rather than one after another. Listeners are independent observers;
      // making listener #2 wait for #1's network call would be both slow and
      // surprising.
      //
      // Promise.resolve().then(...) normalises the call so a listener that
      // throws synchronously is captured as a rejection rather than escaping
      // emit() and breaking the remaining listeners.
      snapshot.map((listener) => Promise.resolve().then(() => listener(data)))
    );

    // Why allSettled and not all() — this is the crux of the exercise:
    //
    // With Promise.all, ONE misbehaving listener would reject the whole emit,
    // and the emitter (which has no idea what any listener does) would report
    // failure for an event that other listeners handled perfectly well. Worse,
    // the caller would lose all visibility into which ones succeeded.
    //
    // allSettled returns a full report — [{status, value}|{status, reason}] in
    // registration order — so the emitter stays neutral: it delivers the event
    // and hands back what happened, letting the caller decide what matters.
    //
    // An unknown event simply maps an empty array, so emit resolves to [] — no
    // special case, and firing an event nobody listens to is never an error.
  }
}

module.exports = AsyncEventEmitter;
