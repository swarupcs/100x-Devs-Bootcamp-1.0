// Using `1-counter.md` or `2-counter.md` from the easy section, can you create a
// clock that shows you the current machine time?

// Can you make it so that it updates every second, and shows time in the following formats -

//  - HH:MM::SS (Eg. 13:45:23)

//  - HH:MM::SS AM/PM (Eg 01:45:23 PM)

// Run with:  node medium/2-clock.js     (Ctrl+C to stop)

// Pad a number to two digits: 5 -> "05", 13 -> "13".
//
// padStart is the built-in for this. It's essential for clock display — without
// it, 9:5:3 would render instead of 09:05:03, and the text would jitter in width
// as the numbers change.
//
// Note String() first: padStart is a string method, so the number has to be
// converted before it can be padded.
const pad = (num) => String(num).padStart(2, "0");

// --- 24-hour format: HH:MM:SS -------------------------------------------------
function format24Hour(date) {
  const hours = pad(date.getHours()); // 0-23, already what we want
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${hours}:${minutes}:${seconds}`;
}

// --- 12-hour format: HH:MM:SS AM/PM -------------------------------------------
function format12Hour(date) {
  const rawHours = date.getHours(); // still 0-23

  // Anything from noon onward is PM. Note this is decided from the RAW 0-23
  // value, before conversion — doing it after would lose the information.
  const period = rawHours >= 12 ? "PM" : "AM";

  // Convert 0-23 into 1-12.
  //
  // The `|| 12` is the subtle part and the classic bug in hand-rolled clocks:
  //   - 13 % 12 = 1  -> 1 PM   correct
  //   - 23 % 12 = 11 -> 11 PM  correct
  //   - 12 % 12 = 0  -> would display "00 PM" instead of 12 PM
  //   - 0  % 12 = 0  -> would display "00 AM" instead of 12 AM (midnight)
  // Since 0 is falsy, `|| 12` maps both of those zeros back to 12.
  const hours = pad(rawHours % 12 || 12);
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  return `${hours}:${minutes}:${seconds} ${period}`;
}

function tick() {
  // A fresh Date() on every tick reads the CURRENT machine time. This matters:
  // incrementing a stored counter instead would drift out of sync, because timer
  // callbacks never fire at exactly the requested interval. Re-reading the real
  // clock each time means the display is always correct regardless of drift.
  const now = new Date();

  // \r returns the cursor to the start of the line without advancing to a new
  // one, so each update overwrites the previous — the display stays on one line
  // instead of scrolling. process.stdout.write is used rather than console.log
  // precisely because console.log always appends a newline.
  process.stdout.write(`\r24-hour: ${format24Hour(now)}   |   12-hour: ${format12Hour(now)}`);
}

// Print immediately so there's no blank second before the first tick — timers
// fire AFTER their delay, never at zero.
tick();

// setInterval repeats indefinitely. Compare 2-counter.js for the recursive
// setTimeout alternative; for a clock either works fine, since re-reading
// Date() on every tick makes the display immune to timer drift anyway.
const clockInterval = setInterval(tick, 1000);

// Graceful shutdown on Ctrl+C. Clearing the interval releases the event loop so
// the process can actually exit — an outstanding timer would otherwise keep Node
// alive.
process.on("SIGINT", () => {
  clearInterval(clockInterval);
  console.log("\nClock stopped.");
  process.exit(0);
});
