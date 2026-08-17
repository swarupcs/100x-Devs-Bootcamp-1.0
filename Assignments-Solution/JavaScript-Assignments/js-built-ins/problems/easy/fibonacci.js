/*
  Write two functions to generate the Fibonacci sequence:

  1. `fibonacci` (Iterative Version):
     - Takes an integer `n` as input and returns an array containing the first `n` numbers in the Fibonacci sequence.

  2. `fibonacciRecursive` (Recursive Version):
     - Takes an integer `n` as input and returns the `n`-th number in the Fibonacci sequence using recursion.

  What is the Fibonacci sequence?
  - The Fibonacci sequence starts with 0 and 1, and each subsequent number is the sum of the two preceding numbers.

  Example:
  - Input: 10
  - Output (Iterative): [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
  - Output (Recursive): 55        <- F(10), see the indexing note below

  - Input: 5
  - Output (Iterative): [0, 1, 1, 2, 3]
  - Output (Recursive): 5         <- F(5)

  - Input: 0
  - Output (Iterative): []
  - Output (Recursive): 0

  NOTE ON INDEXING — the two functions mean different things by `n`, which is a
  genuine source of confusion:
    - fibonacci(n)          -> the first n TERMS, so fibonacci(10) ends at F(9) = 34
    - fibonacciRecursive(n) -> the single n-th TERM, so fibonacciRecursive(10) = 55
  With F(0) = 0 and F(1) = 1, the sequence is:
    index: 0  1  2  3  4  5  6  7   8   9  10
    value: 0  1  1  2  3  5  8  13  21  34  55
  (The original comment block in this file listed 34 and 3 for the recursive
  cases — those are F(9) and F(4), an off-by-one. The tests use the standard
  indexing shown above.)

  Once you've implemented the logic, test your code by running
  - `npm run test-fibonacci`
*/

// --- Iterative version: returns the first `n` terms as an array --------------
function fibonacci(n) {
  const sequence = [];

  // Two rolling variables hold the only state the algorithm needs: the current
  // term and the next one. This is why the iterative version is O(n) time and
  // O(1) working memory — it never looks further back than one step.
  let current = 0;
  let next = 1;

  for (let i = 0; i < n; i++) {
    sequence.push(current);

    // Advance the window by one position. Destructuring assignment performs the
    // swap atomically — the right-hand side is fully evaluated BEFORE anything
    // is assigned, so we don't need a temporary variable and can't accidentally
    // clobber `current` before reading it (the classic bug when writing this as
    // two separate statements).
    [current, next] = [next, current + next];
  }

  return sequence;

  // n = 0 returns [] naturally: the loop never runs.
}

// --- Recursive version: returns the single n-th term -------------------------
function fibonacciRecursive(n) {
  // Base cases. These are what terminate the recursion — without them the calls
  // would descend forever into negative n and overflow the stack. F(0) = 0 and
  // F(1) = 1 are the two seeds the whole sequence is defined from.
  if (n <= 0) return 0;
  if (n === 1) return 1;

  // The recurrence, transcribed directly from the mathematical definition:
  //     F(n) = F(n-1) + F(n-2)
  // This is the clearest possible expression of what Fibonacci *is*, which is
  // exactly why it's the textbook recursion example.
  return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);

  // The catch, and it's a big one: this is O(2^n). The call tree recomputes the
  // same subproblems exponentially many times — F(5) alone computes F(2) three
  // separate times, and F(50) would take longer than you'd care to wait.
  //
  // The standard fix is memoisation, which collapses it to O(n) by remembering
  // each answer the first time it's computed:
  //
  //     function fib(n, memo = {}) {
  //       if (n <= 0) return 0;
  //       if (n === 1) return 1;
  //       if (memo[n] !== undefined) return memo[n];
  //       return (memo[n] = fib(n - 1, memo) + fib(n - 2, memo));
  //     }
  //
  // The plain recursion is kept here because the assignment asks for it, and
  // because seeing WHY it's slow is more instructive than being handed the fix.
  // In production, prefer the iterative version above: it's O(n), allocates
  // nothing per step, and can't overflow the call stack.
}

module.exports = { fibonacci, fibonacciRecursive };
