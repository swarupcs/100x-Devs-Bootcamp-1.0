// ## Create a counter in JavaScript

// We have already covered this in the second lesson, but as an easy recap try to code a counter in Javascript
// It should go up as time goes by in intervals of 1 second

// Run with:  node easy/1-counter.js     (Ctrl+C to stop)

// The counter lives OUTSIDE the function, in the module scope. This is what lets
// its value survive between invocations — a variable declared inside
// updateCounter would be re-created as 0 on every tick and the count would never
// grow past 1.
let counter = 0;

const updateCounter = () => {
  counter++;
  console.log(counter);
};

// setInterval schedules updateCounter to run REPEATEDLY, roughly every 1000ms,
// until it is explicitly cancelled. It returns a handle you can pass to
// clearInterval to stop it — worth capturing in real code, since an uncancelled
// interval keeps the Node process alive forever (which is why this script never
// exits on its own).
const intervalId = setInterval(updateCounter, 1000);

// Two things worth understanding about the timing:
//
// 1. The first tick happens AFTER 1000ms, not immediately. If you want an
//    instant first count, call updateCounter() once before scheduling.
//
// 2. "Every 1 second" is a request, not a guarantee. setInterval fires as close
//    to the interval as it can, but the callback still has to wait for the
//    single JS thread to be free. If synchronous work is hogging the thread when
//    the timer expires, the tick is delayed — and if the callback itself takes
//    longer than the interval, ticks can bunch up.
//
//    This is the key difference from 2-counter.js, which uses recursive
//    setTimeout: there, each delay is measured from the END of the previous run,
//    so the gap between ticks is guaranteed even if the work is slow.

// Demonstrating the cleanup that a real program would need. Without something
// like this the interval runs until the process is killed.
setTimeout(() => {
  clearInterval(intervalId);
  console.log("Counter stopped after 10 seconds.");
}, 10000);
