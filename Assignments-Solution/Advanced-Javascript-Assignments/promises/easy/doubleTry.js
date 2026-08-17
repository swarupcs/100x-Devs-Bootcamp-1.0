// Problem Description – Double Try (Basic Retry)
//
// You are given an async function fn that may fail.
// Your task is to implement doubleTry(fn).
//
// Call fn once. If it succeeds, return the result.
// If it fails, call fn one more time immediately.
// If the second attempt fails, reject with the error.

async function doubleTry(fn) {
  try {
    // Attempt #1. `await` here is essential — without it, a rejection from `fn`
    // would escape the try/catch entirely (the try block would have already
    // exited by the time the promise settles) and the retry would never happen.
    return await fn();
  } catch (firstError) {
    // Attempt #2, immediately. We deliberately do NOT catch this one: letting it
    // propagate means the async function's own promise rejects with the second
    // error, which is what the caller wants to see — the most recent, most
    // relevant reason the operation is failing.
    return await fn();
  }
}

module.exports = doubleTry;
