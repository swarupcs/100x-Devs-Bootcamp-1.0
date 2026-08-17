// Problem Description – Chunk Array
//
// When dealing with large datasets, it's often necessary to process them
// in smaller batches (chunks) to avoid overloading the CPU or I/O.
//
// Your task is to implement a function `chunkArray(array, size)` that
// splits an array into sub-arrays of a maximum specified size.
//
// Requirements:
// 1. The function should return a new array containing the chunks.
// 2. The last chunk might be smaller than the specified size.
// 3. Handle edge cases like empty arrays or chunk size <= 0.
//
// This is a prerequisite for common patterns like batching API calls.

function chunkArray(array, size) {
  // Defensive guards, returning an empty array rather than throwing. A size of
  // 0 or less is especially important to catch: `i += 0` in the loop below would
  // never advance and would spin forever, allocating until the process dies.
  if (!Array.isArray(array)) return [];
  if (!Number.isFinite(size) || size <= 0) return [];

  const chunks = [];

  // Step through the array `size` elements at a time. `slice` conveniently
  // clamps at the end of the array, so the final chunk is simply whatever is
  // left over — no special-casing needed for a non-multiple length.
  //
  // slice() also returns a NEW array each time, so the caller can mutate a chunk
  // without corrupting the input. (The elements themselves are shared by
  // reference — this is a shallow copy, not a deep one.)
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }

  return chunks;
}

module.exports = chunkArray;
