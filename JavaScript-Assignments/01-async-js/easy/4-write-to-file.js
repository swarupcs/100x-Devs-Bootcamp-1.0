// ## Write to a file

// Using the fs library again, try to write to the contents of a file.
// You can use the fs library to as a black box, the goal is to understand async tasks.

// Run with:  node easy/4-write-to-file.js

const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "output.txt");

const content = "Written asynchronously at " + new Date().toISOString() + "\n";

console.log("1. Scheduling the write");

// fs.writeFile REPLACES the file's entire contents (creating it if absent).
// Use fs.appendFile instead when you want to add to the end rather than
// overwrite — a distinction worth being deliberate about, since writeFile
// silently destroys whatever was there before.
fs.writeFile(filePath, content, "utf-8", (err) => {
  // Error-first callback: the first parameter is reserved for a failure (a
  // missing directory, a permissions problem, a full disk), and checking it
  // FIRST is the convention that makes every Node async API feel the same.
  if (err) {
    console.error("Write failed:", err.message);
    return;
  }

  console.log("3. Write finished. Now reading it back...");

  // NESTING the read inside the write callback is deliberate and necessary. The
  // read must not start until the write has actually completed — otherwise we
  // might read the old contents, or an empty file, because the write is still
  // in flight.
  //
  // This dependency is exactly what "callback hell" comes from: each new
  // sequential step adds another level of indentation. Promises flatten it into
  // a .then() chain, and async/await flattens it further into straight-line code:
  //
  //     await fs.promises.writeFile(filePath, content);
  //     const data = await fs.promises.readFile(filePath, "utf-8");
  //
  // Same ordering guarantee, none of the nesting.
  fs.readFile(filePath, "utf-8", (readErr, data) => {
    if (readErr) {
      console.error("Read-back failed:", readErr.message);
      return;
    }
    console.log("4. File now contains:", data.trim());
  });
});

console.log("2. Write scheduled (file NOT written yet)");

// Output order: 1, 2, 3, 4.
//
// Line 2 printing before line 3 is the thing to notice — writeFile returned
// immediately without doing any work. The actual disk write happens on libuv's
// thread pool, and the callback is only queued once it completes. Everything
// after the write call runs first.
