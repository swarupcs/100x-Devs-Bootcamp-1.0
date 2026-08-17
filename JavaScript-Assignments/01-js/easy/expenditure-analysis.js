/*
  Implement a function `calculateTotalSpentByCategory` which takes a list of transactions as parameter
  and return a list of objects where each object is unique category-wise and has total price spent as its value.
  Transaction - an object like { itemName, category, price, timestamp }.
  Output - [{ category, totalSpent }, ...]

  Once you've implemented the logic, test your code by running
  - `npm run test-expenditure-analysis`
*/

function calculateTotalSpentByCategory(transactions) {
  // This is the classic "group by, then aggregate" shape, done in two phases.

  // --- Phase 1: accumulate into a lookup keyed by category ------------------
  //
  // A Map is used rather than a plain object for two reasons that matter here:
  //   1. It preserves INSERTION ORDER for string keys reliably, which is what
  //      gives us first-seen category ordering in the output (Food, Clothing,
  //      Electronics — matching the order they first appear in the input).
  //   2. It has no prototype, so a category literally named "constructor" or
  //      "__proto__" can't collide with inherited properties — a real hazard
  //      when the keys come from user data.
  const totalsByCategory = new Map();

  for (const transaction of transactions) {
    const { category, price } = transaction;

    // Read the running total, defaulting to 0 the first time we see a category.
    // `|| 0` would also work here, but `?? 0` is safer in general: it only
    // substitutes for null/undefined, so a legitimately-zero running total isn't
    // needlessly replaced.
    const currentTotal = totalsByCategory.get(category) ?? 0;

    totalsByCategory.set(category, currentTotal + price);
  }

  // --- Phase 2: reshape the lookup into the required array-of-objects -------
  //
  // The aggregation and the formatting are kept separate on purpose. Trying to
  // build the output array directly inside the loop would force a linear search
  // ("does an entry for this category already exist?") on every transaction,
  // turning an O(n) algorithm into O(n·k). The Map gives O(1) lookups instead.
  const result = [];
  for (const [category, totalSpent] of totalsByCategory) {
    result.push({ category, totalSpent });
  }

  return result;

  // An empty input needs no special case: the loop never runs, the Map stays
  // empty, and we naturally return [].
}

module.exports = calculateTotalSpentByCategory;
