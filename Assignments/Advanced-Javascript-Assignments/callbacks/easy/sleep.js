// Problem Description – sleep(ms, callback)
//
// You are required to write a function named sleep that accepts a time duration
// in milliseconds and a callback function.
// The function should wait for the specified time and then invoke the callback.

function sleep(millis, callback) {
  // setTimeout schedules `callback` on the macrotask (timer) queue. It does NOT
  // block the thread — JS keeps running, and the event loop picks the callback
  // up once (a) the timer has expired AND (b) the call stack is empty.
  //
  // This is why the elapsed time is ">= millis", never exactly millis: the timer
  // only becomes *eligible* to run at `millis`; if the loop is busy it runs later.
  setTimeout(callback, millis);
}

module.exports = sleep;
