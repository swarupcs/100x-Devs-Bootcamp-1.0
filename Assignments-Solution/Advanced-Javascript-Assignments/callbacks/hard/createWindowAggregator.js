// Problem Description – Sliding Window (Moving Average) Aggregator
//
// You are receiving a stream of numeric values asynchronously
// (e.g., sensor readings).
//
// Your task is to maintain a sliding window of the last N values
// and compute the moving average whenever a new value arrives.
//
// This problem tests state management and async data handling.
//
// Requirements:
// - Maintain only the last N values (fixed-size window).
// - Accept values asynchronously via a callback-style input.
// - On each new value, compute and emit the current average.
// - Before N values are received, compute the average
//   using only the available values.

function createWindowAggregator(windowSize, onWindowReady) {
  // The window is the only state. It never grows past `windowSize`, which is the
  // whole point: a stream can be infinite, but memory usage here is O(N), not
  // O(number of readings). `sum` is kept alongside so each update is O(1)
  // instead of re-adding the whole window every time.
  const window = [];
  let sum = 0;

  return function add(value) {
    window.push(value);
    sum += value;

    // Once the window is full, every new value evicts the oldest one — this is
    // what makes it "sliding" rather than merely "growing". Subtracting the
    // evicted value keeps the running sum consistent.
    if (window.length > windowSize) {
      sum -= window.shift();
    }

    // Divide by the *actual* window length, not by windowSize. During the warm-up
    // period (fewer than N readings seen) dividing by N would drag the average
    // toward zero and report a value that never actually occurred.
    onWindowReady(sum / window.length);
  };
}

module.exports = createWindowAggregator;
