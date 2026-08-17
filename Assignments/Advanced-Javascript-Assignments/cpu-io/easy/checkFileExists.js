// Problem Description – Check File Exists
//
// Your task is to implement an asynchronous function `checkFileExists(path)`
// that returns `true` if a file exists and `false` otherwise.
//
// Requirements:
// 1. Use the `fs.promises` API.
// 2. Do NOT use `fs.existsSync` (which is synchronous).
// 3. Hint: Use `fs.promises.access()` and handle the error if it doesn't exist.

const fs = require("fs").promises;

async function checkFileExists(path) {
  try {
    // fs.access() checks permissions/reachability. With no mode argument it
    // defaults to F_OK — "does this path exist?" — and resolves with undefined
    // on success. It communicates failure by REJECTING (with ENOENT for a
    // missing path), which is why the whole thing lives in a try/catch.
    //
    // The async version matters: existsSync would stop the event loop while the
    // OS performs a disk syscall. Under load — a server checking a file per
    // request — those blocked microseconds stack up into real latency for every
    // other connection sharing the thread.
    await fs.access(path);
    return true;
  } catch {
    // Any failure means "not usable": the path is missing, or a permissions
    // problem hides it, or `path` was null/undefined and the call threw a
    // TypeError. All of them collapse to the same honest answer: false.
    return false;
  }

  // Worth knowing: using this as a guard before opening a file is an anti-pattern
  // (a TOCTOU race — the file can vanish between the check and the open). The
  // robust idiom is to just attempt the operation and handle ENOENT. This
  // function is for cases where existence itself is the answer you want.
}

module.exports = checkFileExists;
