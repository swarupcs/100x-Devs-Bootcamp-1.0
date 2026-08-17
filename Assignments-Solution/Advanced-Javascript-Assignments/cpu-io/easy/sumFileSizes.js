// Problem Description – Sum File Sizes
//
// You are given an array of file paths. Your task is to implement a function
// that returns the total size of all these files in bytes.
//
// Requirements:
// 1. Use fs.promises.stat() to get file information.
// 2. Return the sum of `size` property of all files.
// 3. Handle cases where a file might not exist (optional: you can let it throw or return 0).
// 4. Tasks should ideally be performed in parallel for efficiency.

const fs = require("fs").promises;

async function sumFileSizes(filePaths) {
  if (!Array.isArray(filePaths) || filePaths.length === 0) return 0;

  // Fire every stat() call FIRST, collecting promises without awaiting. Each
  // call hands work to libuv's thread pool immediately, so N disk lookups
  // overlap instead of queueing behind one another.
  //
  // Contrast the tempting sequential version:
  //     for (const p of filePaths) total += (await fs.stat(p)).size;
  // That waits for each disk round-trip before starting the next, turning N
  // independent I/O operations into N × latency. This is THE canonical
  // "don't await inside a loop" lesson — the sequential form is correct but can
  // be an order of magnitude slower.
  const statPromises = filePaths.map((path) => fs.stat(path));

  // Promise.all waits for all of them concurrently. If any path is missing,
  // its stat rejects with ENOENT and Promise.all propagates that rejection —
  // the caller finds out something was wrong rather than silently getting a
  // total that's quietly too small.
  const stats = await Promise.all(statPromises);

  // `size` is in bytes. Duplicate paths are counted twice by design: the caller
  // asked for the sum of a list, not the size of a set.
  return stats.reduce((total, stat) => total + stat.size, 0);
}

module.exports = sumFileSizes;
