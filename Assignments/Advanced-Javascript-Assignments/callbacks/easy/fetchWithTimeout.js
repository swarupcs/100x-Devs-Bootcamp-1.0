// Problem Description – fetchWithTimeout(url, ms, callback)
//
// You are required to write a function named fetchWithTimeout that accepts a URL,
// a time limit in milliseconds, and a callback function.
// The function attempts to fetch data from the given URL.
// If the request completes within the specified time, the callback is invoked with
// null as the first argument and the fetched data as the second argument.
// If the operation exceeds the time limit, the callback is invoked with an Error
// whose message is "Request Timed Out".

function fetchWithTimeout(url, ms, callback) {
  // Two independent async events race each other here: the fetch finishing and
  // the timer firing. Exactly one of them must win, so we need a latch — without
  // it the slow fetch would still invoke the callback a second time after the
  // timeout already reported failure, and the caller would see one request
  // produce two outcomes.
  let done = false;

  const timer = setTimeout(() => {
    if (done) return;
    done = true;
    callback(new Error("Request Timed Out"));
  }, ms);

  fetch(url, (err, data) => {
    if (done) return; // the timeout already won; drop this late response
    done = true;

    // Cancel the pending timer. Beyond correctness (the latch already handles
    // that), this frees the event loop: Node keeps the process alive while a
    // timer is outstanding, so leaking timers stops a script from exiting.
    clearTimeout(timer);

    if (err) return callback(err);
    callback(null, data);
  });
}

module.exports = fetchWithTimeout;
