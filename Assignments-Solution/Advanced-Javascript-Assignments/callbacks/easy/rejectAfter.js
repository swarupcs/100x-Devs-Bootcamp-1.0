// Problem Description – rejectAfter(ms, callback)
//
// You are required to create a function named rejectAfter that accepts a time
// duration in milliseconds and a callback function.
// The function should wait for the specified time and then invoke the callback
// with an error.

function rejectAfter(ms, callback) {
  setTimeout(() => {
    // The mirror image of `delay`: on the failure path the error slot carries a
    // real Error object and the data slot is explicitly `null`.
    //
    // Using `new Error(...)` rather than a bare string matters — an Error carries
    // a stack trace captured at construction time, which is the only breadcrumb
    // you get when a failure surfaces from inside a timer (by then the original
    // call stack is long gone, since the timer callback runs on a fresh stack).
    callback(new Error(`Rejected after ${ms}ms`), null);
  }, ms);
}

module.exports = rejectAfter;
