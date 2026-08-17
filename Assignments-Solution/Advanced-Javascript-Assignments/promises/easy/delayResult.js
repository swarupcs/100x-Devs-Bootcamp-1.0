// Problem Description – Delayed Success (Sleep Wrapper)
//
// You are given a value and a delay time in milliseconds.
// Your task is to implement delayResult(value, ms).
//
// The function must return a Promise that resolves with the given value
// only after ms milliseconds.

function delayResult(value, ms) {
  // The Promise constructor takes an "executor" function that runs
  // *synchronously* and receives the two settle functions. We hold onto
  // `resolve` inside the timer closure and call it later — that deferral is
  // exactly what turns a callback-style timer into a thenable value.
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), ms);
  });

  // Because the promise is returned immediately (pending), callers can start
  // several of these at once and await them together — the delays overlap
  // instead of adding up. Awaiting each one in sequence would serialise them.
}

module.exports = delayResult;
