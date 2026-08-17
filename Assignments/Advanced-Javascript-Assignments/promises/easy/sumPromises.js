// Problem Description – Sum of Two Promises
//
// You are given two Promises that each resolve to numeric values.
// Your task is to return a new Promise that resolves to the sum of these two numbers.
// Both Promises should be executed in parallel using Promise.all to avoid unnecessary waiting.

async function sumPromises(p1, p2) {
  // Promise.all awaits both CONCURRENTLY, so the total wait is max(t1, t2)
  // rather than t1 + t2.
  //
  // The naive alternative —
  //     const a = await p1;
  //     const b = await p2;
  // — happens to behave the same here only because both promises were already
  // started by the caller. But the moment you're awaiting function *calls*
  // (`await fetchA()` then `await fetchB()`), the sequential form genuinely
  // serialises them: fetchB isn't even started until fetchA resolves. Reaching
  // for Promise.all by default is the habit that avoids that whole class of bug.
  const [a, b] = await Promise.all([p1, p2]);

  return a + b;

  // Bonus: if either input rejects, Promise.all rejects, and because this is an
  // async function that rejection propagates out as the rejection of
  // sumPromises — no explicit error handling required.
}

module.exports = sumPromises;
