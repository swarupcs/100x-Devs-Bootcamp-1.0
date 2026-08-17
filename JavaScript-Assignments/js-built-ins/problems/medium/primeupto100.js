/*
  Write a function `getPrimesUpTo100` which returns an array of all prime numbers up to 100.

  What is a prime number?
  - A prime number is a number greater than 1 that has no divisors other than 1 and itself.

  Example:
  - Output: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]

  Once you've implemented the logic, test your code by running
  - `npm run test-prime`
*/

function getPrimesUpTo100() {
  const LIMIT = 100;

  // --- Sieve of Eratosthenes ------------------------------------------------
  //
  // Rather than testing each number for primality one at a time, the sieve
  // inverts the problem: assume everything is prime, then repeatedly cross out
  // the multiples of each prime you find. Whatever survives is prime.
  //
  // It's over 2,000 years old and still the fastest practical way to enumerate
  // all primes below a bound: O(n log log n), versus O(n·sqrt(n)) for testing
  // each candidate individually.

  // Index i of this array answers "is i prime?". Length LIMIT + 1 so index 100
  // exists — an off-by-one here would silently drop the last candidate.
  const isPrime = new Array(LIMIT + 1).fill(true);

  // 0 and 1 are not prime by definition. 1 is excluded deliberately: allowing it
  // would break the Fundamental Theorem of Arithmetic, since every number could
  // then be factored in infinitely many ways (12 = 2·2·3 = 1·2·2·3 = ...).
  isPrime[0] = false;
  isPrime[1] = false;

  // Sieve only up to sqrt(LIMIT).
  //
  // Why that's sufficient: if a composite n has any divisor larger than sqrt(n),
  // it must ALSO have a matching one smaller than sqrt(n) (they pair up to
  // multiply to n). So every composite is guaranteed to be crossed out by some
  // prime at or below sqrt(n) — anything still standing past that point is prime.
  for (let i = 2; i * i <= LIMIT; i++) {
    // Skip numbers already crossed out; their multiples were handled when their
    // smallest prime factor was processed.
    if (!isPrime[i]) continue;

    // Start crossing out at i*i, not at 2*i.
    //
    // Everything below i*i that is a multiple of i (2i, 3i, ... up to (i-1)·i)
    // has a smaller factor and was therefore already eliminated on an earlier
    // pass. Starting at the square skips all that redundant work.
    for (let multiple = i * i; multiple <= LIMIT; multiple += i) {
      isPrime[multiple] = false;
    }
  }

  // Collect the survivors, in ascending order by construction.
  const primes = [];
  for (let i = 2; i <= LIMIT; i++) {
    if (isPrime[i]) primes.push(i);
  }

  return primes;

  // Result: 25 primes between 2 and 100, ending at 97 (98, 99 and 100 are all
  // composite).
  //
  // The trade-off worth naming: the sieve uses O(n) memory for the boolean
  // array. To test a SINGLE large number for primality you'd want trial division
  // up to its square root instead — or Miller-Rabin for genuinely big values.
  // Sieves shine when you want every prime in a range.
}

module.exports = { getPrimesUpTo100 };
