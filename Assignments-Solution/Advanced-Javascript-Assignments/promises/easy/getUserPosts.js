// Problem Description – Rewrite Async/Await Using Promise Chaining
//
// You are given an asynchronous function written using async and await.
// Your task is to rewrite the same logic using only .then() and .catch() syntax,
// without changing its behavior.
//
// Original:
// async function getUserPosts(userId) {
//   try {
//     const user = await fetchUser(userId);
//     return await fetchPosts(user.id);
//   } catch (e) {
//     console.error(e);
//   }
// }

function getUserPosts(userId) {
  return fetchUser(userId)
    .then((user) => {
      // RETURNING a promise from inside .then() is the direct translation of
      // `await`. The outer chain does not continue until this inner promise
      // settles, and its resolved value becomes the value of the outer chain.
      //
      // Forgetting the `return` here is the single most common promise-chaining
      // bug: the chain would resolve with `undefined` immediately and the posts
      // would arrive too late for anyone to see.
      return fetchPosts(user.id);
    })
    .catch((e) => {
      // .catch() placed at the END of the chain catches a rejection from ANY
      // link above it — fetchUser and fetchPosts alike — which is exactly what
      // the single try/catch wrapping both awaits did.
      console.error(e);

      // Matching the original's behaviour precisely: the try/catch swallows the
      // error and the function falls off the end, so it resolves with undefined
      // rather than rejecting. (Whether that's *good* design is another matter —
      // a swallowed error leaves the caller unable to tell success from failure —
      // but the task is a faithful rewrite.)
    });
}

module.exports = getUserPosts;
