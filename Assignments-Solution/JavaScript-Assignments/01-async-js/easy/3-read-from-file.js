// ## Reading the contents of a file

// Write code to read contents of a file and print it to the console.
// You can use the fs library to as a black box, the goal is to understand async tasks.
// Try to do an expensive operation below the file read and see how it affects the output.
// Make the expensive operation more and more expensive and see how it affects the output.

// Run with:  node easy/3-read-from-file.js

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "sample.txt");

// Create the sample file on first run, so this script works standalone.
// (writeFileSync is used deliberately here — it's setup, not the lesson.)
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, "Hello from the file system!\nThis is line two.\n");
}

console.log("1. Before the read is scheduled");

// fs.readFile is ASYNCHRONOUS. This call does NOT read the file — it hands the
// job to libuv's thread pool and returns immediately. The callback is queued to
// run later, once the data is ready AND the main thread is free.
fs.readFile(filePath, "utf-8", (err, data) => {
  if (err) {
    console.error("Failed to read file:", err.message);
    return;
  }
  console.log("4. File contents:\n" + data);
});

console.log("2. Right after the read is scheduled (file NOT read yet)");

// --- The expensive operation the exercise asks for ------------------------
//
// This is the whole point of the experiment. The file read finished long ago —
// probably within a millisecond — but its callback CANNOT run while this loop is
// executing, because JavaScript is single-threaded and the event loop only picks
// up queued callbacks once the current call stack is empty.
//
// TRY THIS: raise ITERATIONS to 1e8, then 1e9. The console output order never
// changes — 1, 2, 3, then 4 — but step 4 arrives later and later. The disk I/O
// itself isn't getting slower; you're just making the callback wait longer for
// its turn on the thread.
//
// The lesson: async does NOT mean parallel. The I/O genuinely happens in the
// background (on a real OS thread), but your JavaScript callback still has to
// queue up for the one and only JS thread. Blocking that thread delays every
// pending callback, no matter how fast the underlying operation was.
const ITERATIONS = 1e7; // try 1e8, then 1e9
let sum = 0;
for (let i = 0; i < ITERATIONS; i++) {
  sum += i;
}

console.log("3. Expensive operation finished. Sum =", sum);

// Expected output order:
//   1. Before the read is scheduled
//   2. Right after the read is scheduled (file NOT read yet)
//   3. Expensive operation finished...
//   4. File contents: ...
//
// Note that 4 is ALWAYS last, even though the file was ready before the loop
// started. Compare fs.readFileSync, which would block until the data arrived and
// print the contents between 1 and 2 — simpler to reason about, but it freezes
// the thread while the disk works, which in a server means no other request can
// be served during that time.
